import { ElementaOverlay } from './overlay';
import { extractElementTree, getElementDOMPath, getElementClassList } from './extract-styles';
import { findSimilarElements } from './similar-patterns';
import { runFullExtraction } from '../shared/codegen';
import { 
  ElementSummary, 
  BreadcrumbItem, 
  ComponentExtractionResult, 
  ExportOptions 
} from '../shared/types';
import {
  ElementHoveredMessage,
  ElementSelectedMessage,
  ExtractionResultMessage,
  InspectionStatusChangedMessage
} from '../shared/messages';

const DEFAULT_OPTIONS: ExportOptions = {
  format: 'react-tsx',
  scopeClassPrefix: 'elementa-comp',
  inlineAssets: false,
  assetThresholdKb: 50,
  includeTypeScript: true,
  componentName: 'ExtractedComponent',
  extractAsRepeated: true,
  maxSubtreeDepth: 15,
};

export class InspectorManager {
  private isInspecting = false;
  private overlay: ElementaOverlay | null = null;
  private hoveredElement: Element | null = null;
  private selectedElement: Element | null = null;
  private childNavigationStack: Element[] = [];
  private similarElements: Element[] = [];
  private highlightSimilar = true;
  private mutationObserver: MutationObserver | null = null;
  private rafId: number | null = null;
  private currentOptions: ExportOptions = DEFAULT_OPTIONS;

  constructor() {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleScrollOrResize = this.handleScrollOrResize.bind(this);
  }

  public start(options?: Partial<ExportOptions>): void {
    if (options) {
      this.currentOptions = { ...this.currentOptions, ...options };
    }

    if (this.isInspecting) return;
    this.isInspecting = true;

    if (!this.overlay) {
      this.overlay = new ElementaOverlay();
    } else {
      this.overlay.mount();
    }

    window.addEventListener('mousemove', this.handleMouseMove, { capture: true, passive: true });
    window.addEventListener('click', this.handleClick, { capture: true });
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.addEventListener('scroll', this.handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', this.handleScrollOrResize, { passive: true });

    this.notifyStatus();
  }

  public stop(): void {
    if (!this.isInspecting) return;
    this.isInspecting = false;

    window.removeEventListener('mousemove', this.handleMouseMove, { capture: true });
    window.removeEventListener('click', this.handleClick, { capture: true });
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    window.removeEventListener('scroll', this.handleScrollOrResize, { capture: true });
    window.removeEventListener('resize', this.handleScrollOrResize);

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    this.hoveredElement = null;
    this.selectedElement = null;
    this.childNavigationStack = [];
    this.similarElements = [];

    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }

    this.notifyStatus();
  }

  public toggleSimilarHighlight(enabled: boolean): void {
    this.highlightSimilar = enabled;
    if (!enabled && this.overlay) {
      this.overlay.clearSimilarHighlights();
    } else if (enabled && this.overlay && this.similarElements.length > 0) {
      this.overlay.updateSimilarHighlights(this.similarElements);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isInspecting || this.selectedElement) return;

    if (this.rafId) cancelAnimationFrame(this.rafId);

    this.rafId = requestAnimationFrame(() => {
      const target = this.getInspectableElementAt(e.clientX, e.clientY);
      if (!target || target === this.hoveredElement) return;

      this.hoveredElement = target;
      this.similarElements = findSimilarElements(target);

      if (this.overlay) {
        this.overlay.updateHover(target, this.similarElements.length);
        if (this.highlightSimilar && this.similarElements.length > 0) {
          this.overlay.updateSimilarHighlights(this.similarElements);
        } else {
          this.overlay.clearSimilarHighlights();
        }
      }

      const summary = this.buildElementSummary(target);
      const msg: ElementHoveredMessage = {
        type: 'ELEMENT_HOVERED',
        payload: {
          summary,
          similarCount: this.similarElements.length,
        },
      };
      this.safeSendMessage(msg);
    });
  }

  private handleClick(e: MouseEvent): void {
    if (!this.isInspecting) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const target = this.getInspectableElementAt(e.clientX, e.clientY);
    if (!target) return;

    this.selectElement(target);
  }

  public selectElement(el: Element, options?: ExportOptions): void {
    this.selectedElement = el;
    this.childNavigationStack = [];
    this.similarElements = findSimilarElements(el);

    if (options) {
      this.currentOptions = options;
    }

    if (this.overlay) {
      this.overlay.hideHover();
      this.overlay.updateSelection(el, this.similarElements.length);
      if (this.highlightSimilar && this.similarElements.length > 0) {
        this.overlay.updateSimilarHighlights(this.similarElements);
      } else {
        this.overlay.clearSimilarHighlights();
      }
    }

    this.observeElement(el);

    const summary = this.buildElementSummary(el);
    const breadcrumbs = this.buildBreadcrumbs(el);

    // Run extraction immediately upon selection
    let extraction: ComponentExtractionResult | null = null;
    try {
      extraction = this.extract(this.currentOptions);
    } catch (err) {
      console.warn('[Elementa] Extraction error during selection:', err);
    }

    const msg: ElementSelectedMessage = {
      type: 'ELEMENT_SELECTED',
      payload: {
        summary,
        breadcrumbs,
        similarCount: this.similarElements.length,
        hasParent: !!el.parentElement && el.parentElement !== document.documentElement,
        hasChildren: el.children.length > 0,
        extractionResult: extraction,
      },
    };
    this.safeSendMessage(msg);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isInspecting) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.deselect();
    } else if (e.key === 'ArrowUp' && this.selectedElement) {
      e.preventDefault();
      e.stopPropagation();
      this.navigateParent();
    } else if (e.key === 'ArrowDown' && this.selectedElement) {
      e.preventDefault();
      e.stopPropagation();
      this.navigateChild();
    }
  }

  public navigateParent(): void {
    if (!this.selectedElement) return;
    
    let parent: Element | null = this.selectedElement.parentElement;
    if (!parent) {
      const root = this.selectedElement.getRootNode();
      if (root instanceof ShadowRoot) {
        parent = root.host;
      }
    }

    if (!parent || parent === document.documentElement) return;

    this.childNavigationStack.push(this.selectedElement);
    this.selectElement(parent);
  }

  public navigateChild(): void {
    if (this.childNavigationStack.length > 0) {
      const child = this.childNavigationStack.pop();
      if (child && document.contains(child)) {
        this.selectElement(child);
        return;
      }
    }

    if (this.selectedElement) {
      if (this.selectedElement.shadowRoot && this.selectedElement.shadowRoot.firstElementChild) {
        this.selectElement(this.selectedElement.shadowRoot.firstElementChild);
      } else if (this.selectedElement.firstElementChild) {
        this.selectElement(this.selectedElement.firstElementChild);
      }
    }
  }

  public navigateBreadcrumb(domPath: string): void {
    if (!this.selectedElement) return;
    let curr: Element | null = this.selectedElement;

    while (curr && curr !== document.documentElement) {
      const path = getElementDOMPath(curr);
      if (path === domPath) {
        this.selectElement(curr);
        return;
      }
      curr = curr.parentElement;
    }
  }

  public deselect(): void {
    this.selectedElement = null;
    this.childNavigationStack = [];
    this.similarElements = [];

    if (this.overlay) {
      this.overlay.hideSelection();
      this.overlay.clearSimilarHighlights();
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    const msg: ElementHoveredMessage = {
      type: 'ELEMENT_HOVERED',
      payload: { summary: null, similarCount: 0 },
    };
    this.safeSendMessage(msg);
  }

  public extract(options: ExportOptions): ComponentExtractionResult | null {
    this.currentOptions = options;
    const target = this.selectedElement || this.hoveredElement;
    if (!target) return null;

    const rootTree = extractElementTree(target, 300, options.maxSubtreeDepth || 20);

    let repeatedTrees: any[] = [];
    if (options.extractAsRepeated && this.similarElements.length > 0) {
      repeatedTrees = [
        rootTree,
        ...this.similarElements.map((el) => extractElementTree(el, 150, 10)),
      ];
    }

    const result = runFullExtraction(rootTree, repeatedTrees, options);

    const msg: ExtractionResultMessage = {
      type: 'EXTRACTION_RESULT',
      payload: { result },
    };
    this.safeSendMessage(msg);

    return result;
  }

  private handleScrollOrResize(): void {
    if (!this.isInspecting) return;
    if (this.selectedElement && this.overlay) {
      this.overlay.updateSelection(this.selectedElement, this.similarElements.length);
      if (this.highlightSimilar && this.similarElements.length > 0) {
        this.overlay.updateSimilarHighlights(this.similarElements);
      }
    } else if (this.hoveredElement && this.overlay) {
      this.overlay.updateHover(this.hoveredElement, this.similarElements.length);
    }
  }

  private observeElement(el: Element): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    this.mutationObserver = new MutationObserver(() => {
      if (!document.contains(el)) {
        console.warn('[Elementa] Selected element was removed from DOM');
        this.deselect();
      }
    });

    if (el.parentElement) {
      this.mutationObserver.observe(el.parentElement, { childList: true, subtree: true });
    }
  }

  private getInspectableElementAt(x: number, y: number): Element | null {
    const elements = document.elementsFromPoint(x, y);
    for (let el of elements) {
      if (el.getAttribute && el.getAttribute('data-elementa-ignore')) continue;
      if (el.closest && el.closest('#elementa-overlay-root')) continue;
      if (el === document.body || el === document.documentElement) continue;

      while (el && (el as any).shadowRoot) {
        const inner = (el as any).shadowRoot.elementFromPoint(x, y);
        if (inner && inner !== el) {
          el = inner;
        } else {
          break;
        }
      }

      return el;
    }
    return null;
  }

  private buildElementSummary(el: Element): ElementSummary {
    const rect = el.getBoundingClientRect();
    const classList = getElementClassList(el);

    return {
      tagName: el.tagName.toLowerCase(),
      id: el.id || undefined,
      classList,
      rect: {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      snippet: el.outerHTML ? el.outerHTML.slice(0, 180) : `<${el.tagName.toLowerCase()}>`,
      domPath: getElementDOMPath(el),
    };
  }

  private buildBreadcrumbs(el: Element): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [];
    let current: Element | null = el;
    let depth = 0;

    while (current && current !== document.documentElement) {
      const classList = getElementClassList(current);

      items.unshift({
        tagName: current.tagName.toLowerCase(),
        id: current.id || undefined,
        classList,
        domPath: getElementDOMPath(current),
        depth: depth++,
        isCurrent: current === el,
      });

      if (current.parentElement) {
        current = current.parentElement;
      } else {
        const root = current.getRootNode();
        if (root instanceof ShadowRoot) {
          current = root.host;
        } else {
          break;
        }
      }
    }

    return items;
  }

  private notifyStatus(): void {
    const msg: InspectionStatusChangedMessage = {
      type: 'INSPECTION_STATUS_CHANGED',
      payload: {
        isInspecting: this.isInspecting,
        hasSelection: !!this.selectedElement,
      },
    };
    this.safeSendMessage(msg);
  }

  private safeSendMessage(msg: any): void {
    try {
      chrome.runtime.sendMessage(msg).catch(() => {
        // Suppress errors when side panel is closed
      });
    } catch {
      // Ignore
    }
  }
}
