import { StyleProperty, StyleRule, PseudoRule, ExtractedElement, ExtractedAsset } from '../shared/types';

export function getElementClassString(el: Element): string {
  if (!el) return '';
  if (typeof el.className === 'string') return el.className;
  if (el.className && typeof (el.className as any).baseVal === 'string') return (el.className as any).baseVal;
  return el.getAttribute('class') || '';
}

export function getElementClassList(el: Element): string[] {
  const str = getElementClassString(el);
  if (!str) return [];
  return str.trim().split(/\s+/).filter(Boolean);
}

// Tailwind utility heuristic detector
const TAILWIND_UTILITY_REGEX = /^(?:(?:sm|md|lg|xl|2xl|dark|hover|focus|focus-visible|focus-within|active|disabled|visited|first|last|odd|even|group-hover|peer-hover|group-focus):)*(?:(?:bg|text|border|ring|outline|divide|from|to|via|fill|stroke|shadow|rounded|m|mx|my|mt|mb|ml|mr|p|px|py|pt|pb|pl|pr|w|h|min-w|max-w|min-h|max-h|gap|space-x|space-y|inset|top|bottom|left|right|z|opacity|flex|grid|col-span|row-span|grid-cols|grid-rows|items|justify|content|self|order|basis|grow|shrink|font|leading|tracking|line-clamp|aspect|cursor|pointer-events|select|overflow|align|transform|transition|duration|delay|ease|animate|scale|rotate|translate|skew|blur|backdrop-blur|brightness|contrast|drop-shadow)-(?:\[[^\]]+\]|[\w\-\.\/]+)|(?:flex|inline-flex|grid|inline-grid|block|inline-block|inline|hidden|table|isolate|absolute|relative|fixed|sticky|static|visible|invisible|truncate|uppercase|lowercase|capitalize|italic|not-italic|underline|line-through|no-underline|antialiased|subpixel-antialiased|sr-only|not-sr-only))$/;

export function isTailwindClass(cls: string): boolean {
  if (!cls || typeof cls !== 'string') return false;
  const clean = cls.trim();
  return TAILWIND_UTILITY_REGEX.test(clean);
}

export function classifyClasses(classList: string[]): {
  tailwindClasses: string[];
  customClasses: string[];
  isTailwindElement: boolean;
} {
  const tailwindClasses: string[] = [];
  const customClasses: string[] = [];

  for (const cls of classList) {
    if (!cls) continue;
    if (isTailwindClass(cls)) {
      tailwindClasses.push(cls);
    } else {
      customClasses.push(cls);
    }
  }

  const isTailwindElement =
    (classList.length > 0 && tailwindClasses.length / classList.length >= 0.5) ||
    tailwindClasses.length >= 3;

  return { tailwindClasses, customClasses, isTailwindElement };
}

// Specificity calculation: (inline, IDs, classes/attrs/pseudo-classes, tags/pseudo-elements)
export function calculateSpecificity(selector: string): number {
  let idCount = 0;
  let classCount = 0;
  let tagCount = 0;

  const cleanSelector = selector.replace(/\\./g, '_');

  const ids = cleanSelector.match(/#[a-zA-Z0-9_-]+/g);
  if (ids) idCount += ids.length;

  const classes = cleanSelector.match(/\.[a-zA-Z0-9_-]+/g);
  if (classes) classCount += classes.length;

  const attrs = cleanSelector.match(/\[[^\]]+\]/g);
  if (attrs) classCount += attrs.length;

  const pseudoElements = cleanSelector.match(/::[a-zA-Z0-9_-]+/g);
  if (pseudoElements) tagCount += pseudoElements.length;

  const pseudoClasses = cleanSelector.replace(/::[a-zA-Z0-9_-]+/g, '').match(/:[a-zA-Z0-9_-]+(?:\([^)]*\))?/g);
  if (pseudoClasses) {
    for (const _ of pseudoClasses) {
      classCount += 1;
    }
  }

  const simplified = cleanSelector
    .replace(/#[a-zA-Z0-9_-]+/g, ' ')
    .replace(/\.[a-zA-Z0-9_-]+/g, ' ')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/::?[a-zA-Z0-9_-]+(?:\([^)]*\))?/g, ' ')
    .replace(/[>+~*]/g, ' ');

  const tags = simplified.match(/\b[a-zA-Z0-9_-]+\b/g);
  if (tags) tagCount += tags.length;

  return idCount * 100 + classCount * 10 + tagCount * 1;
}

export function parsePseudoSelector(selector: string): {
  baseSelector: string;
  pseudo: string | null;
} {
  const pseudoMatch = selector.match(/(::?[a-zA-Z0-9_-]+)(?:\([^)]*\))?$/);
  if (pseudoMatch) {
    const pseudo = pseudoMatch[1];
    const baseSelector = selector.slice(0, selector.length - pseudoMatch[0].length).trim();
    return {
      baseSelector: baseSelector || '*',
      pseudo,
    };
  }
  return { baseSelector: selector, pseudo: null };
}

const ESSENTIAL_COMPUTED_PROPS = [
  'display',
  'flex-direction',
  'flex-wrap',
  'align-items',
  'justify-content',
  'gap',
  'grid-template-columns',
  'grid-template-rows',
  'position',
  'color',
  'background-color',
  'background-image',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-align',
  'border-radius',
  'border-width',
  'border-style',
  'border-color',
  'box-shadow',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'width',
  'height',
  'max-width',
  'min-width',
  'overflow',
  'cursor',
  'opacity',
  'z-index',
];

export function extractMatchedRules(
  el: Element,
  doc: Document = document
): {
  matchedRules: StyleRule[];
  pseudoRules: PseudoRule[];
  skippedSheetsCount: number;
} {
  const matchedRules: StyleRule[] = [];
  const pseudoRules: PseudoRule[] = [];
  let skippedSheetsCount = 0;

  const allSheets: CSSStyleSheet[] = [];

  try {
    if (doc.styleSheets) {
      allSheets.push(...Array.from(doc.styleSheets));
    }
  } catch {
    skippedSheetsCount++;
  }

  try {
    if ((doc as any).adoptedStyleSheets) {
      allSheets.push(...Array.from((doc as any).adoptedStyleSheets as CSSStyleSheet[]));
    }
  } catch {
    // Ignore
  }

  try {
    const rootNode = el.getRootNode();
    if (rootNode instanceof ShadowRoot) {
      if ((rootNode as any).adoptedStyleSheets) {
        allSheets.push(...Array.from((rootNode as any).adoptedStyleSheets as CSSStyleSheet[]));
      }
      const shadowStyles = rootNode.querySelectorAll('style');
      shadowStyles.forEach((s) => {
        if (s.sheet) allSheets.push(s.sheet);
      });
    }
  } catch {
    // Ignore
  }

  for (let sIdx = 0; sIdx < allSheets.length; sIdx++) {
    const sheet = allSheets[sIdx];
    let cssRules: CSSRuleList;
    try {
      cssRules = sheet.cssRules;
      if (!cssRules) continue;
    } catch {
      skippedSheetsCount++;
      continue;
    }

    try {
      scanRules(cssRules, el, sheet.href || `sheet-${sIdx}`, matchedRules, pseudoRules);
    } catch (e) {
      console.warn('[Elementa] Error parsing CSS rules:', e);
    }
  }

  // Fallback computed style capture
  const classList = getElementClassList(el);
  const { isTailwindElement } = classifyClasses(classList);
  if (!isTailwindElement && matchedRules.length === 0 && el instanceof HTMLElement) {
    try {
      const computed = window.getComputedStyle(el);
      const computedProperties: StyleProperty[] = [];

      for (const prop of ESSENTIAL_COMPUTED_PROPS) {
        const val = computed.getPropertyValue(prop);
        if (val && !isDefaultOrInheritedValue(prop, val)) {
          computedProperties.push({
            property: prop,
            value: val,
            important: false,
          });
        }
      }

      if (computedProperties.length > 0) {
        const classStr = getElementClassString(el);
        const firstClass = classStr.trim().split(/\s+/)[0];
        const selector = el.id ? `#${el.id}` : firstClass ? `.${firstClass}` : el.tagName.toLowerCase();
        matchedRules.push({
          selector,
          properties: computedProperties,
          specificity: 1,
          sourceSheet: 'computed-fallback',
        });
      }
    } catch {
      // Ignore
    }
  }

  return { matchedRules, pseudoRules, skippedSheetsCount };
}

function isDefaultOrInheritedValue(prop: string, val: string): boolean {
  if (!val || val === 'none' || val === 'normal' || val === 'auto' || val === '0px' || val === 'rgba(0, 0, 0, 0)') {
    if (prop === 'display' && val !== 'none') return false;
    if (prop === 'border-radius' && val === '0px') return true;
    if (prop === 'margin-top' && val === '0px') return true;
    if (prop === 'padding-top' && val === '0px') return true;
    if (prop === 'box-shadow' && val === 'none') return true;
    if (prop === 'background-color' && (val === 'rgba(0, 0, 0, 0)' || val === 'transparent')) return true;
  }
  return false;
}

function scanRules(
  rules: CSSRuleList,
  el: Element,
  sourceSheet: string,
  matchedRules: StyleRule[],
  pseudoRules: PseudoRule[]
): void {
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];

    if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules) {
      scanRules((rule as CSSGroupingRule).cssRules, el, sourceSheet, matchedRules, pseudoRules);
      continue;
    }

    if (rule.type !== CSSRule.STYLE_RULE) continue;
    const styleRule = rule as CSSStyleRule;
    const selectorText = styleRule.selectorText;
    if (!selectorText) continue;

    const subSelectors = selectorText.split(',').map((s) => s.trim());

    for (const subSelector of subSelectors) {
      const { baseSelector, pseudo } = parsePseudoSelector(subSelector);

      if (pseudo) {
        let baseMatches = false;
        try {
          if (baseSelector === '*' || el.matches(baseSelector)) {
            baseMatches = true;
          }
        } catch {
          baseMatches = false;
        }

        if (baseMatches) {
          const properties = extractRuleProperties(styleRule.style, el);
          if (properties.length > 0) {
            pseudoRules.push({
              pseudo: pseudo as any,
              selector: subSelector,
              properties,
            });
          }
        }
      } else {
        let matches = false;
        try {
          matches = el.matches(subSelector);
        } catch {
          matches = false;
        }

        if (matches) {
          const specificity = calculateSpecificity(subSelector);
          const properties = extractRuleProperties(styleRule.style, el);
          if (properties.length > 0) {
            matchedRules.push({
              selector: subSelector,
              properties,
              specificity,
              sourceSheet,
            });
          }
        }
      }
    }
  }
}

function extractRuleProperties(style: CSSStyleDeclaration, contextEl?: Element): StyleProperty[] {
  const properties: StyleProperty[] = [];
  if (!style) return properties;

  for (let i = 0; i < style.length; i++) {
    const propName = style[i];
    let value = style.getPropertyValue(propName);
    const priority = style.getPropertyPriority(propName);

    if (value && value.trim()) {
      if (contextEl && value.includes('var(--')) {
        value = resolveCssVariables(value, contextEl);
      }

      properties.push({
        property: propName,
        value: value.trim(),
        important: priority === 'important',
      });
    }
  }
  return properties;
}

function resolveCssVariables(cssValue: string, el: Element): string {
  try {
    const computed = window.getComputedStyle(el);
    return cssValue.replace(/var\((--[a-zA-Z0-9_-]+)(?:,\s*([^)]+))?\)/g, (_, varName, fallback) => {
      const resolved = computed.getPropertyValue(varName)?.trim();
      if (resolved) return resolved;
      return fallback || varName;
    });
  } catch {
    return cssValue;
  }
}

export function resolveCascadeProperties(
  matchedRules: StyleRule[],
  inlineStyle: CSSStyleDeclaration | Record<string, string>
): Map<string, { value: string; selector: string; important: boolean }> {
  const resolved = new Map<
    string,
    { value: string; selector: string; important: boolean; specificity: number; sourceIndex: number }
  >();

  let ruleIndex = 0;
  for (const rule of matchedRules) {
    ruleIndex++;
    for (const prop of rule.properties) {
      const existing = resolved.get(prop.property);

      if (!existing) {
        resolved.set(prop.property, {
          value: prop.value,
          selector: rule.selector,
          important: prop.important,
          specificity: rule.specificity,
          sourceIndex: ruleIndex,
        });
      } else {
        let wins = false;
        if (prop.important && !existing.important) {
          wins = true;
        } else if (!prop.important && existing.important) {
          wins = false;
        } else {
          if (rule.specificity > existing.specificity) {
            wins = true;
          } else if (rule.specificity === existing.specificity && ruleIndex >= existing.sourceIndex) {
            wins = true;
          }
        }

        if (wins) {
          resolved.set(prop.property, {
            value: prop.value,
            selector: rule.selector,
            important: prop.important,
            specificity: rule.specificity,
            sourceIndex: ruleIndex,
          });
        }
      }
    }
  }

  if (inlineStyle) {
    if (typeof (inlineStyle as CSSStyleDeclaration).getPropertyValue === 'function') {
      const decl = inlineStyle as CSSStyleDeclaration;
      for (let i = 0; i < decl.length; i++) {
        const propName = decl[i];
        const val = decl.getPropertyValue(propName);
        const priority = decl.getPropertyPriority(propName);
        const isImportant = priority === 'important';

        const existing = resolved.get(propName);
        if (!existing || isImportant || !existing.important) {
          resolved.set(propName, {
            value: val,
            selector: 'inline',
            important: isImportant,
            specificity: 1000,
            sourceIndex: 99999,
          });
        }
      }
    } else {
      const record = inlineStyle as Record<string, string>;
      for (const [propName, val] of Object.entries(record)) {
        if (!val) continue;
        const isImportant = val.includes('!important');
        const cleanVal = val.replace(/!important/g, '').trim();

        const existing = resolved.get(propName);
        if (!existing || isImportant || !existing.important) {
          resolved.set(propName, {
            value: cleanVal,
            selector: 'inline',
            important: isImportant,
            specificity: 1000,
            sourceIndex: 99999,
          });
        }
      }
    }
  }

  const cleanResult = new Map<string, { value: string; selector: string; important: boolean }>();
  for (const [k, v] of resolved.entries()) {
    cleanResult.set(k, { value: v.value, selector: v.selector, important: v.important });
  }

  return cleanResult;
}

export function extractElementTree(
  rootEl: Element,
  maxNodes = 300,
  maxDepth = 25
): ExtractedElement {
  let totalNodes = 0;

  function traverse(el: Element, depth: number): ExtractedElement {
    totalNodes++;
    const tagName = el.tagName.toLowerCase();
    const classList = getElementClassList(el);
    const { tailwindClasses, customClasses, isTailwindElement } = classifyClasses(classList);

    const attributes: Record<string, string> = {};
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      if (attr.name.startsWith('data-elementa')) continue;
      attributes[attr.name] = attr.value;
    }

    const { matchedRules, pseudoRules } = extractMatchedRules(el);

    const inlineStyles: Record<string, string> = {};
    if (el instanceof HTMLElement && el.style) {
      for (let i = 0; i < el.style.length; i++) {
        const prop = el.style[i];
        inlineStyles[prop] = el.style.getPropertyValue(prop);
      }
    }

    let textContent = '';
    for (const childNode of Array.from(el.childNodes)) {
      if (childNode.nodeType === Node.TEXT_NODE && childNode.textContent?.trim()) {
        textContent += childNode.textContent.trim() + ' ';
      }
    }
    textContent = textContent.trim();

    const assets: ExtractedAsset[] = scanElementAssets(el);

    const rect = el.getBoundingClientRect();
    const rectData = {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };

    const domPath = getElementDOMPath(el);

    const children: ExtractedElement[] = [];
    if (depth < maxDepth && totalNodes < maxNodes) {
      let childElements = Array.from(el.children);
      
      if (el.shadowRoot) {
        childElements = [...childElements, ...Array.from(el.shadowRoot.children)];
      }

      for (const child of childElements) {
        if (child.getAttribute && child.getAttribute('data-elementa-ignore')) continue;
        if (totalNodes >= maxNodes) break;
        children.push(traverse(child, depth + 1));
      }
    }

    return {
      id: el.id || '',
      tagName,
      classList,
      attributes,
      rect: rectData,
      matchedRules,
      pseudoRules,
      inlineStyles,
      isTailwind: isTailwindElement,
      tailwindClasses,
      customClasses,
      textContent,
      outerHTML: el.outerHTML,
      children,
      depth,
      domPath,
      assets,
    };
  }

  return traverse(rootEl, 0);
}

export function getElementDOMPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
      parts.unshift(selector);
      break;
    } else {
      const classStr = getElementClassString(current);
      const first = classStr.trim().split(/\s+/)[0];
      if (first && !first.includes(':') && !first.includes('/')) {
        selector += `.${first}`;
      }
      parts.unshift(selector);
    }
    
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

  return parts.join(' > ') || el.tagName.toLowerCase();
}

function scanElementAssets(el: Element): ExtractedAsset[] {
  const assets: ExtractedAsset[] = [];
  const origin = window.location.origin;
  const tag = el.tagName.toLowerCase();

  // 1. <img> and lazy-loaded image attributes
  if (tag === 'img') {
    const rawSrc =
      el.getAttribute('src') ||
      el.getAttribute('data-src') ||
      el.getAttribute('data-original') ||
      el.getAttribute('data-url') ||
      el.getAttribute('data-hires');

    if (rawSrc) {
      const resolved = resolveUrl(rawSrc, origin);
      assets.push({
        id: `img-${Math.random().toString(36).substring(2, 9)}`,
        type: 'image',
        originalUrl: rawSrc,
        resolvedUrl: resolved,
        filename: extractFilenameFromUrl(resolved, 'image.png'),
        isInlined: rawSrc.startsWith('data:'),
        elementTag: 'img',
      });
    }

    const srcset = el.getAttribute('srcset') || el.getAttribute('data-srcset');
    if (srcset) {
      const items = srcset.split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean);
      for (const item of items) {
        if (item && item !== rawSrc) {
          const resolved = resolveUrl(item, origin);
          assets.push({
            id: `srcset-${Math.random().toString(36).substring(2, 9)}`,
            type: 'image',
            originalUrl: item,
            resolvedUrl: resolved,
            filename: extractFilenameFromUrl(resolved, 'image-hd.png'),
            isInlined: item.startsWith('data:'),
            elementTag: 'img',
          });
        }
      }
    }
  }

  // 2. <source> in <picture> / <audio> / <video>
  if (tag === 'source') {
    const src = el.getAttribute('srcset') || el.getAttribute('src') || el.getAttribute('data-src');
    if (src) {
      const firstSrc = src.split(',')[0].trim().split(/\s+/)[0];
      const resolved = resolveUrl(firstSrc, origin);
      assets.push({
        id: `source-${Math.random().toString(36).substring(2, 9)}`,
        type: 'image',
        originalUrl: firstSrc,
        resolvedUrl: resolved,
        filename: extractFilenameFromUrl(resolved, 'source-asset.png'),
        isInlined: firstSrc.startsWith('data:'),
        elementTag: 'source',
      });
    }
  }

  // 3. Inline <svg> Elements - Convert to full data URI
  if (tag === 'svg') {
    try {
      const svgOuter = el.outerHTML;
      const cleanSvg = svgOuter.replace(/data-elementa-[a-z]+="[^"]*"/g, '');
      const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(cleanSvg)}`;
      
      const ariaLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
      const classStr = getElementClassString(el);
      const iconName = ariaLabel
        ? ariaLabel.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
        : classStr
        ? classStr.split(/\s+/)[0].replace(/[^a-z0-9_-]/g, '-')
        : 'icon';

      assets.push({
        id: `svg-${Math.random().toString(36).substring(2, 9)}`,
        type: 'svg',
        originalUrl: svgDataUri,
        resolvedUrl: svgDataUri,
        dataUri: svgDataUri,
        filename: `${iconName}.svg`,
        isInlined: true,
        elementTag: 'svg',
      });
    } catch {
      // Ignore
    }
  }

  // 4. SVG <image> and <use> tags
  if (tag === 'image') {
    const href = el.getAttribute('href') || el.getAttribute('xlink:href');
    if (href) {
      const resolved = resolveUrl(href, origin);
      assets.push({
        id: `svgimg-${Math.random().toString(36).substring(2, 9)}`,
        type: 'image',
        originalUrl: href,
        resolvedUrl: resolved,
        filename: extractFilenameFromUrl(resolved, 'svg-image.png'),
        isInlined: href.startsWith('data:'),
        elementTag: 'image',
      });
    }
  }

  // 5. <video> and <audio> elements
  if (tag === 'video' || tag === 'audio') {
    const src = el.getAttribute('src');
    const poster = el.getAttribute('poster');
    const isVideo = tag === 'video';

    if (src) {
      const resolved = resolveUrl(src, origin);
      assets.push({
        id: `media-${Math.random().toString(36).substring(2, 9)}`,
        type: isVideo ? 'video' : 'image',
        originalUrl: src,
        resolvedUrl: resolved,
        filename: extractFilenameFromUrl(resolved, isVideo ? 'video.mp4' : 'audio.mp3'),
        isInlined: false,
        elementTag: tag,
      });
    }

    if (poster) {
      const resolved = resolveUrl(poster, origin);
      assets.push({
        id: `poster-${Math.random().toString(36).substring(2, 9)}`,
        type: 'image',
        originalUrl: poster,
        resolvedUrl: resolved,
        filename: extractFilenameFromUrl(resolved, 'poster.jpg'),
        isInlined: false,
        elementTag: 'video',
      });
    }
  }

  // 6. CSS background-image and mask-image
  if (el instanceof HTMLElement) {
    try {
      const style = el.style;
      const computed = window.getComputedStyle(el);
      const bg = style.backgroundImage || computed.backgroundImage;
      const mask = style.maskImage || computed.maskImage || (style as any).webkitMaskImage || (computed as any).webkitMaskImage;

      const checkUrlString = (str: string, assetType: 'background' | 'image') => {
        if (str && str !== 'none') {
          const matches = str.matchAll(/url\(['"]?([^'"]+)['"]?\)/g);
          for (const match of matches) {
            const rawUrl = match[1];
            if (rawUrl && !rawUrl.startsWith('data:')) {
              const resolved = resolveUrl(rawUrl, origin);
              assets.push({
                id: `bg-${Math.random().toString(36).substring(2, 9)}`,
                type: assetType,
                originalUrl: rawUrl,
                resolvedUrl: resolved,
                filename: extractFilenameFromUrl(resolved, 'bg-image.png'),
                isInlined: false,
                elementTag: tag,
              });
            }
          }
        }
      };

      checkUrlString(bg, 'background');
      checkUrlString(mask, 'image');
    } catch {
      // Ignore
    }
  }

  return assets;
}

export function resolveUrl(url: string, base: string): string {
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

export function extractFilenameFromUrl(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname;
    const cleanPath = pathname.split('?')[0].split('#')[0];
    const name = cleanPath.split('/').pop();
    if (name && name.includes('.') && name.length > 2) return name;
    return fallback;
  } catch {
    return fallback;
  }
}
