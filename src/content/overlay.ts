// Overlay and Highlighting System for Elementa
// Uses Shadow DOM encapsulation to ensure zero page style collision or layout shifts.

export interface OverlayPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export class ElementaOverlay {
  private container: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  
  // Elements inside Shadow DOM
  private hoverBox: HTMLDivElement | null = null;
  private hoverBadge: HTMLDivElement | null = null;
  private selectBox: HTMLDivElement | null = null;
  private selectBadge: HTMLDivElement | null = null;
  private similarContainer: HTMLDivElement | null = null;
  private guideTooltip: HTMLDivElement | null = null;

  constructor() {
    this.mount();
  }

  public mount(): void {
    if (this.container && document.body.contains(this.container)) return;

    // Check if previous leftover exists
    const existing = document.getElementById('elementa-overlay-root');
    if (existing) existing.remove();

    this.container = document.createElement('div');
    this.container.id = 'elementa-overlay-root';
    this.container.setAttribute('data-elementa-ignore', 'true');
    this.container.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      overflow: visible !important;
    `;

    this.shadow = this.container.attachShadow({ mode: 'open' });

    // Inject encapsulated styling
    const style = document.createElement('style');
    style.textContent = `
      * {
        box-sizing: border-box !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif !important;
        user-select: none !important;
        pointer-events: none !important;
      }

      .elementa-box {
        position: fixed !important;
        pointer-events: none !important;
        transition: top 0.04s ease-out, left 0.04s ease-out, width 0.04s ease-out, height 0.04s ease-out !important;
        z-index: 2147483640 !important;
      }

      .elementa-hover-box {
        border: 2px solid #6366f1 !important;
        background: rgba(99, 102, 241, 0.15) !important;
        box-shadow: 0 0 15px rgba(99, 102, 241, 0.35) !important;
        border-radius: 3px !important;
      }

      .elementa-select-box {
        border: 2px solid #10b981 !important;
        background: rgba(16, 185, 129, 0.2) !important;
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.45) !important;
        border-radius: 4px !important;
        z-index: 2147483645 !important;
      }

      .elementa-similar-box {
        position: fixed !important;
        border: 1.5px dashed #f59e0b !important;
        background: rgba(245, 158, 11, 0.08) !important;
        border-radius: 3px !important;
        pointer-events: none !important;
      }

      .elementa-badge {
        position: absolute !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        padding: 3px 8px !important;
        border-radius: 4px !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        line-height: 1.2 !important;
        white-space: nowrap !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        pointer-events: none !important;
        backdrop-filter: blur(8px) !important;
      }

      .elementa-hover-badge {
        background: #1e1b4b !important;
        color: #e0e7ff !important;
        border: 1px solid #6366f1 !important;
      }

      .elementa-select-badge {
        background: #064e3b !important;
        color: #d1fae5 !important;
        border: 1px solid #10b981 !important;
      }

      .tag-name {
        color: #a5b4fc !important;
        font-weight: 700 !important;
      }

      .tag-name.selected {
        color: #6ee7b7 !important;
      }

      .class-name {
        color: #cbd5e1 !important;
        max-width: 140px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      .dim-badge {
        color: #94a3b8 !important;
        font-size: 10px !important;
        font-weight: 400 !important;
      }

      .similar-counter {
        background: #78350f !important;
        color: #fde68a !important;
        padding: 1px 5px !important;
        border-radius: 10px !important;
        font-size: 9px !important;
        font-weight: 700 !important;
        border: 1px solid #f59e0b !important;
      }

      .elementa-guide {
        position: fixed !important;
        bottom: 24px !important;
        right: 24px !important;
        background: rgba(15, 23, 42, 0.92) !important;
        border: 1px solid #334155 !important;
        border-radius: 8px !important;
        padding: 10px 14px !important;
        color: #f8fafc !important;
        font-size: 12px !important;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        backdrop-filter: blur(12px) !important;
        pointer-events: none !important;
      }

      .guide-row {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }

      .kbd {
        background: #1e293b !important;
        border: 1px solid #475569 !important;
        color: #38bdf8 !important;
        padding: 1px 5px !important;
        border-radius: 3px !important;
        font-size: 10px !important;
        font-weight: 600 !important;
      }
    `;

    this.shadow.appendChild(style);

    // Similar matches container
    this.similarContainer = document.createElement('div');
    this.shadow.appendChild(this.similarContainer);

    // Hover box & badge
    this.hoverBox = document.createElement('div');
    this.hoverBox.className = 'elementa-box elementa-hover-box';
    this.hoverBox.style.display = 'none';

    this.hoverBadge = document.createElement('div');
    this.hoverBadge.className = 'elementa-badge elementa-hover-badge';
    this.hoverBox.appendChild(this.hoverBadge);
    this.shadow.appendChild(this.hoverBox);

    // Select box & badge
    this.selectBox = document.createElement('div');
    this.selectBox.className = 'elementa-box elementa-select-box';
    this.selectBox.style.display = 'none';

    this.selectBadge = document.createElement('div');
    this.selectBadge.className = 'elementa-badge elementa-select-badge';
    this.selectBox.appendChild(this.selectBadge);
    this.shadow.appendChild(this.selectBox);

    // Keyboard Shortcuts Guide
    this.guideTooltip = document.createElement('div');
    this.guideTooltip.className = 'elementa-guide';
    this.guideTooltip.innerHTML = `
      <div style="font-weight: 700; color: #818cf8; margin-bottom: 2px;">⚡ Elementa Active</div>
      <div class="guide-row"><span>Click</span> <span style="color:#94a3b8;">Select Element</span></div>
      <div class="guide-row"><span class="kbd">↑</span> <span class="kbd">↓</span> <span style="color:#94a3b8;">Walk DOM Hierarchy</span></div>
      <div class="guide-row"><span class="kbd">Esc</span> <span style="color:#94a3b8;">Deselect / Back to Hover</span></div>
    `;
    this.shadow.appendChild(this.guideTooltip);

    document.documentElement.appendChild(this.container);
  }

  public updateHover(
    el: Element | null, 
    similarCount = 0
  ): void {
    if (!this.hoverBox || !this.hoverBadge) return;

    if (!el || !(el instanceof Element)) {
      this.hoverBox.style.display = 'none';
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      this.hoverBox.style.display = 'none';
      return;
    }

    this.hoverBox.style.display = 'block';
    this.hoverBox.style.top = `${rect.top}px`;
    this.hoverBox.style.left = `${rect.left}px`;
    this.hoverBox.style.width = `${rect.width}px`;
    this.hoverBox.style.height = `${rect.height}px`;

    // Position badge above or inside if near top of viewport
    if (rect.top < 32) {
      this.hoverBadge.style.top = '4px';
      this.hoverBadge.style.bottom = 'auto';
    } else {
      this.hoverBadge.style.top = '-28px';
      this.hoverBadge.style.bottom = 'auto';
    }
    this.hoverBadge.style.left = '0px';

    const tag = el.tagName.toLowerCase();
    const firstClass = el.className && typeof el.className === 'string' 
      ? el.className.trim().split(/\s+/)[0] 
      : '';
    const id = el.id ? `#${el.id}` : '';
    const dim = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;

    let html = `<span class="tag-name">&lt;${tag}&gt;</span>`;
    if (id) html += `<span style="color:#f472b6">${id}</span>`;
    if (firstClass) html += `<span class="class-name">.${firstClass}</span>`;
    html += `<span class="dim-badge">${dim}</span>`;

    if (similarCount > 1) {
      html += `<span class="similar-counter">${similarCount} similar</span>`;
    }

    this.hoverBadge.innerHTML = html;
  }

  public updateSelection(
    el: Element | null, 
    similarCount = 0
  ): void {
    if (!this.selectBox || !this.selectBadge) return;

    if (!el || !(el instanceof Element)) {
      this.selectBox.style.display = 'none';
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      this.selectBox.style.display = 'none';
      return;
    }

    this.selectBox.style.display = 'block';
    this.selectBox.style.top = `${rect.top}px`;
    this.selectBox.style.left = `${rect.left}px`;
    this.selectBox.style.width = `${rect.width}px`;
    this.selectBox.style.height = `${rect.height}px`;

    // Position badge
    if (rect.top < 32) {
      this.selectBadge.style.top = '4px';
      this.selectBadge.style.bottom = 'auto';
    } else {
      this.selectBadge.style.top = '-28px';
      this.selectBadge.style.bottom = 'auto';
    }
    this.selectBadge.style.left = '0px';

    const tag = el.tagName.toLowerCase();
    const firstClass = el.className && typeof el.className === 'string' 
      ? el.className.trim().split(/\s+/)[0] 
      : '';
    const id = el.id ? `#${el.id}` : '';
    const dim = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;

    let html = `<span class="tag-name selected">✓ &lt;${tag}&gt;</span>`;
    if (id) html += `<span style="color:#f472b6">${id}</span>`;
    if (firstClass) html += `<span class="class-name">.${firstClass}</span>`;
    html += `<span class="dim-badge">${dim}</span>`;

    if (similarCount > 1) {
      html += `<span class="similar-counter">${similarCount} instances</span>`;
    }

    this.selectBadge.innerHTML = html;
  }

  public updateSimilarHighlights(elements: Element[], maxToRender = 30): void {
    if (!this.similarContainer) return;
    this.similarContainer.innerHTML = '';

    const toShow = elements.slice(0, maxToRender);
    for (const el of toShow) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;

      const box = document.createElement('div');
      box.className = 'elementa-similar-box';
      box.style.top = `${rect.top}px`;
      box.style.left = `${rect.left}px`;
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;
      this.similarContainer.appendChild(box);
    }
  }

  public clearSimilarHighlights(): void {
    if (this.similarContainer) {
      this.similarContainer.innerHTML = '';
    }
  }

  public hideHover(): void {
    if (this.hoverBox) this.hoverBox.style.display = 'none';
  }

  public hideSelection(): void {
    if (this.selectBox) this.selectBox.style.display = 'none';
  }

  public destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.shadow = null;
    this.hoverBox = null;
    this.selectBox = null;
    this.similarContainer = null;
    this.guideTooltip = null;
  }
}
