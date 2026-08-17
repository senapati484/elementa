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

// Specificity calculation
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

export function resolveCascadeProperties(
  rules: StyleRule[],
  inlineStyles: Record<string, string> = {}
): Map<string, { value: string; important: boolean; specificity: number }> {
  const resolved = new Map<string, { value: string; important: boolean; specificity: number }>();

  const sorted = [...rules].sort((a, b) => (a.specificity || 0) - (b.specificity || 0));

  for (const rule of sorted) {
    const spec = rule.specificity || 0;
    for (const prop of rule.properties) {
      const current = resolved.get(prop.property);
      if (!current) {
        resolved.set(prop.property, {
          value: prop.value,
          important: !!prop.important,
          specificity: spec,
        });
      } else if (prop.important && !current.important) {
        resolved.set(prop.property, {
          value: prop.value,
          important: true,
          specificity: spec,
        });
      } else if (prop.important === current.important && spec >= current.specificity) {
        resolved.set(prop.property, {
          value: prop.value,
          important: !!prop.important,
          specificity: spec,
        });
      }
    }
  }

  for (const [prop, value] of Object.entries(inlineStyles)) {
    if (!value) continue;
    const current = resolved.get(prop);
    const isImportant = value.includes('!important');
    const cleanValue = value.replace('!important', '').trim();

    if (!current || isImportant || !current.important) {
      resolved.set(prop, {
        value: cleanValue,
        important: isImportant,
        specificity: 1000,
      });
    }
  }

  return resolved;
}

export function getEffectiveInheritedStyles(el: Element): {
  backgroundColor: string;
  color: string;
  fontFamily: string;
} {
  let bg = '';
  let color = '';
  let font = '';

  let curr: Element | null = el;
  while (curr && curr !== document.documentElement) {
    try {
      const comp = window.getComputedStyle(curr);
      if (!bg && comp.backgroundColor && comp.backgroundColor !== 'rgba(0, 0, 0, 0)' && comp.backgroundColor !== 'transparent') {
        bg = comp.backgroundColor;
      }
      if (!color && comp.color && comp.color !== 'rgba(0, 0, 0, 0)') {
        color = comp.color;
      }
      if (!font && comp.fontFamily) {
        font = comp.fontFamily;
      }
    } catch {}
    curr = curr.parentElement;
  }

  if (!bg) {
    try {
      const bodyComp = window.getComputedStyle(document.body);
      bg = bodyComp.backgroundColor !== 'rgba(0, 0, 0, 0)' && bodyComp.backgroundColor !== 'transparent'
        ? bodyComp.backgroundColor
        : window.getComputedStyle(document.documentElement).backgroundColor;
    } catch {}
  }
  if (!color) {
    try {
      color = window.getComputedStyle(document.body).color;
    } catch {}
  }
  if (!font) {
    try {
      font = window.getComputedStyle(document.body).fontFamily;
    } catch {}
  }

  return {
    backgroundColor: bg || '#0d1117',
    color: color || '#e6edf3',
    fontFamily: font || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };
}

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

  let liveDisplay = 'block';
  try {
    liveDisplay = window.getComputedStyle(el).display;
  } catch {}

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
      scanRules(cssRules, el, sheet.href || `sheet-${sIdx}`, matchedRules, pseudoRules, liveDisplay);
    } catch (e) {
      console.warn('[Elementa] Error parsing CSS rules:', e);
    }
  }

  // Precise Computed Visual Styles Extraction (Non-ghost properties only)
  if (el instanceof HTMLElement || el instanceof SVGElement) {
    try {
      const comp = window.getComputedStyle(el);
      const computedProperties: StyleProperty[] = [];

      // 1. Display & Layout
      const display = comp.display;
      if (display && display !== 'none') {
        computedProperties.push({ property: 'display', value: display, important: false });
      }

      if (display.includes('flex')) {
        if (comp.flexDirection !== 'row') computedProperties.push({ property: 'flex-direction', value: comp.flexDirection, important: false });
        if (comp.flexWrap !== 'nowrap') computedProperties.push({ property: 'flex-wrap', value: comp.flexWrap, important: false });
        if (comp.alignItems && comp.alignItems !== 'normal') computedProperties.push({ property: 'align-items', value: comp.alignItems, important: false });
        if (comp.justifyContent && comp.justifyContent !== 'normal') computedProperties.push({ property: 'justify-content', value: comp.justifyContent, important: false });
        if (comp.gap && comp.gap !== 'normal' && comp.gap !== '0px') computedProperties.push({ property: 'gap', value: comp.gap, important: false });
      }

      if (display.includes('grid')) {
        if (comp.gridTemplateColumns && comp.gridTemplateColumns !== 'none') computedProperties.push({ property: 'grid-template-columns', value: comp.gridTemplateColumns, important: false });
        if (comp.gridTemplateRows && comp.gridTemplateRows !== 'none') computedProperties.push({ property: 'grid-template-rows', value: comp.gridTemplateRows, important: false });
        if (comp.gap && comp.gap !== 'normal' && comp.gap !== '0px') computedProperties.push({ property: 'gap', value: comp.gap, important: false });
      }

      // 2. Color & Background
      const color = comp.color;
      if (color && color !== 'rgba(0, 0, 0, 0)') {
        computedProperties.push({ property: 'color', value: color, important: false });
      }

      const bg = comp.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        computedProperties.push({ property: 'background-color', value: bg, important: false });
      }

      const bgImg = comp.backgroundImage;
      if (bgImg && bgImg !== 'none') {
        computedProperties.push({ property: 'background-image', value: bgImg, important: false });
      }

      // 3. Typography
      if (comp.fontSize) computedProperties.push({ property: 'font-size', value: comp.fontSize, important: false });
      if (comp.fontWeight && comp.fontWeight !== '400') computedProperties.push({ property: 'font-weight', value: comp.fontWeight, important: false });
      if (comp.lineHeight && comp.lineHeight !== 'normal') computedProperties.push({ property: 'line-height', value: comp.lineHeight, important: false });
      if (comp.textAlign && comp.textAlign !== 'start') computedProperties.push({ property: 'text-align', value: comp.textAlign, important: false });

      // 4. Borders (Only if border actually exists)
      const topW = comp.borderTopWidth;
      const rightW = comp.borderRightWidth;
      const botW = comp.borderBottomWidth;
      const leftW = comp.borderLeftWidth;

      if (topW && topW !== '0px' && comp.borderTopStyle !== 'none') {
        computedProperties.push({ property: 'border-top-width', value: topW, important: false });
        computedProperties.push({ property: 'border-top-style', value: comp.borderTopStyle, important: false });
        computedProperties.push({ property: 'border-top-color', value: comp.borderTopColor, important: false });
      }
      if (rightW && rightW !== '0px' && comp.borderRightStyle !== 'none') {
        computedProperties.push({ property: 'border-right-width', value: rightW, important: false });
        computedProperties.push({ property: 'border-right-style', value: comp.borderRightStyle, important: false });
        computedProperties.push({ property: 'border-right-color', value: comp.borderRightColor, important: false });
      }
      if (botW && botW !== '0px' && comp.borderBottomStyle !== 'none') {
        computedProperties.push({ property: 'border-bottom-width', value: botW, important: false });
        computedProperties.push({ property: 'border-bottom-style', value: comp.borderBottomStyle, important: false });
        computedProperties.push({ property: 'border-bottom-color', value: comp.borderBottomColor, important: false });
      }
      if (leftW && leftW !== '0px' && comp.borderLeftStyle !== 'none') {
        computedProperties.push({ property: 'border-left-width', value: leftW, important: false });
        computedProperties.push({ property: 'border-left-style', value: comp.borderLeftStyle, important: false });
        computedProperties.push({ property: 'border-left-color', value: comp.borderLeftColor, important: false });
      }

      // Border Radius
      if (comp.borderTopLeftRadius && comp.borderTopLeftRadius !== '0px') computedProperties.push({ property: 'border-top-left-radius', value: comp.borderTopLeftRadius, important: false });
      if (comp.borderTopRightRadius && comp.borderTopRightRadius !== '0px') computedProperties.push({ property: 'border-top-right-radius', value: comp.borderTopRightRadius, important: false });
      if (comp.borderBottomRightRadius && comp.borderBottomRightRadius !== '0px') computedProperties.push({ property: 'border-bottom-right-radius', value: comp.borderBottomRightRadius, important: false });
      if (comp.borderBottomLeftRadius && comp.borderBottomLeftRadius !== '0px') computedProperties.push({ property: 'border-bottom-left-radius', value: comp.borderBottomLeftRadius, important: false });

      // Box Shadow
      if (comp.boxShadow && comp.boxShadow !== 'none') {
        computedProperties.push({ property: 'box-shadow', value: comp.boxShadow, important: false });
      }

      // 5. Paddings & Margins (Only non-zero)
      if (comp.paddingTop && comp.paddingTop !== '0px') computedProperties.push({ property: 'padding-top', value: comp.paddingTop, important: false });
      if (comp.paddingRight && comp.paddingRight !== '0px') computedProperties.push({ property: 'padding-right', value: comp.paddingRight, important: false });
      if (comp.paddingBottom && comp.paddingBottom !== '0px') computedProperties.push({ property: 'padding-bottom', value: comp.paddingBottom, important: false });
      if (comp.paddingLeft && comp.paddingLeft !== '0px') computedProperties.push({ property: 'padding-left', value: comp.paddingLeft, important: false });

      if (comp.marginTop && comp.marginTop !== '0px') computedProperties.push({ property: 'margin-top', value: comp.marginTop, important: false });
      if (comp.marginRight && comp.marginRight !== '0px') computedProperties.push({ property: 'margin-right', value: comp.marginRight, important: false });
      if (comp.marginBottom && comp.marginBottom !== '0px') computedProperties.push({ property: 'margin-bottom', value: comp.marginBottom, important: false });
      if (comp.marginLeft && comp.marginLeft !== '0px') computedProperties.push({ property: 'margin-left', value: comp.marginLeft, important: false });

      // 6. SVG specific attributes
      const tag = el.tagName.toLowerCase();
      if (['svg', 'path', 'g', 'circle', 'rect', 'polygon'].includes(tag)) {
        if (comp.fill && comp.fill !== 'none') computedProperties.push({ property: 'fill', value: comp.fill, important: false });
        if (comp.stroke && comp.stroke !== 'none') computedProperties.push({ property: 'stroke', value: comp.stroke, important: false });
      }

      if (computedProperties.length > 0) {
        matchedRules.push({
          selector: el.tagName.toLowerCase(),
          properties: computedProperties,
          specificity: 500,
          sourceSheet: 'computed-styles',
        });
      }
    } catch {
      // Ignore
    }
  }

  return { matchedRules, pseudoRules, skippedSheetsCount };
}

function scanRules(
  rules: CSSRuleList,
  el: Element,
  sourceSheet: string,
  matchedRules: StyleRule[],
  pseudoRules: PseudoRule[],
  liveDisplay: string
): void {
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];

    if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules) {
      scanRules((rule as CSSGroupingRule).cssRules, el, sourceSheet, matchedRules, pseudoRules, liveDisplay);
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
          const properties = extractRuleProperties(styleRule.style, el, liveDisplay);
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
          const properties = extractRuleProperties(styleRule.style, el, liveDisplay);
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

function extractRuleProperties(style: CSSStyleDeclaration, contextEl?: Element, liveDisplay?: string): StyleProperty[] {
  const properties: StyleProperty[] = [];
  if (!style) return properties;

  for (let i = 0; i < style.length; i++) {
    const propName = style[i];
    let value = style.getPropertyValue(propName);
    const priority = style.getPropertyPriority(propName);

    if (value && value.trim()) {
      // If live display is visible, do not allow inactive stylesheet rules to hide the element
      if (propName === 'display' && value.trim() === 'none' && liveDisplay && liveDisplay !== 'none') {
        continue;
      }

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
      if (resolved && resolved !== 'initial' && resolved !== 'inherit') return resolved;
      return fallback || varName;
    });
  } catch {
    return cssValue;
  }
}

export function extractElementTree(
  rootEl: Element,
  maxNodes = 400,
  maxDepth = 30
): ExtractedElement {
  let totalNodes = 0;
  const inherited = getEffectiveInheritedStyles(rootEl);

  function traverse(el: Element, depth: number, isRoot = false): ExtractedElement {
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

    // If root element has transparent background, ensure inherited page background & text color are supplied
    if (isRoot) {
      const rootComp = window.getComputedStyle(el);
      if (rootComp.backgroundColor === 'rgba(0, 0, 0, 0)' || rootComp.backgroundColor === 'transparent') {
        inlineStyles['background-color'] = inherited.backgroundColor;
      }
      if (!inlineStyles['color']) {
        inlineStyles['color'] = inherited.color;
      }
      if (!inlineStyles['font-family']) {
        inlineStyles['font-family'] = inherited.fontFamily;
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
        children.push(traverse(child, depth + 1, false));
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

  return traverse(rootEl, 0, true);
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

function tryGetCanvasDataUri(imgEl: HTMLImageElement): string | null {
  try {
    if (imgEl.complete && imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = imgEl.naturalWidth;
      canvas.height = imgEl.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgEl, 0, 0);
        return canvas.toDataURL('image/png');
      }
    }
  } catch {
    // Tainted canvas fallback
  }
  return null;
}

function scanElementAssets(el: Element): ExtractedAsset[] {
  const assets: ExtractedAsset[] = [];
  const pageUrl = window.location.href;
  const tag = el.tagName.toLowerCase();

  // 1. <img>, lazy images, and avatar tags
  if (tag === 'img' && el instanceof HTMLImageElement) {
    const rawSrc =
      el.getAttribute('src') ||
      el.getAttribute('data-src') ||
      el.getAttribute('data-original') ||
      el.getAttribute('data-url') ||
      el.getAttribute('data-hires') ||
      el.src;

    if (rawSrc) {
      const resolved = resolveUrl(rawSrc, pageUrl);
      const inMemoryDataUri = tryGetCanvasDataUri(el);
      const isInlined = rawSrc.startsWith('data:') || !!inMemoryDataUri;

      assets.push({
        id: `img-${Math.random().toString(36).substring(2, 9)}`,
        type: 'image',
        originalUrl: rawSrc,
        resolvedUrl: resolved,
        dataUri: inMemoryDataUri || (rawSrc.startsWith('data:') ? rawSrc : undefined),
        filename: extractFilenameFromUrl(resolved, 'image.png'),
        isInlined,
        elementTag: 'img',
      });
    }

    const srcset = el.getAttribute('srcset') || el.getAttribute('data-srcset');
    if (srcset) {
      const items = srcset.split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean);
      for (const item of items) {
        if (item && item !== rawSrc) {
          const resolved = resolveUrl(item, pageUrl);
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
      const resolved = resolveUrl(firstSrc, pageUrl);
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

  // 3. Inline <svg> Elements - Self-contained vector extraction
  if (tag === 'svg') {
    try {
      const svgClone = el.cloneNode(true) as SVGElement;
      const uses = svgClone.querySelectorAll('use');
      uses.forEach((useEl) => {
        const href = useEl.getAttribute('href') || useEl.getAttribute('xlink:href');
        if (href && href.startsWith('#')) {
          const targetId = href.slice(1);
          const referencedSymbol = document.getElementById(targetId);
          if (referencedSymbol) {
            const innerElements = referencedSymbol.cloneNode(true) as Element;
            useEl.replaceWith(...Array.from(innerElements.children));
          }
        }
      });

      if (!svgClone.getAttribute('xmlns')) {
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }

      const svgOuter = svgClone.outerHTML;
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

  // 4. SVG <image> tags
  if (tag === 'image') {
    const href = el.getAttribute('href') || el.getAttribute('xlink:href');
    if (href) {
      const resolved = resolveUrl(href, pageUrl);
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
      const resolved = resolveUrl(src, pageUrl);
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
      const resolved = resolveUrl(poster, pageUrl);
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

  // 6. <canvas> snapshot
  if (tag === 'canvas' && el instanceof HTMLCanvasElement) {
    try {
      const dataUri = el.toDataURL('image/png');
      assets.push({
        id: `canvas-${Math.random().toString(36).substring(2, 9)}`,
        type: 'image',
        originalUrl: dataUri,
        resolvedUrl: dataUri,
        dataUri,
        filename: 'canvas-drawing.png',
        isInlined: true,
        elementTag: 'canvas',
      });
    } catch {
      // Ignore
    }
  }

  // 7. CSS background-image, mask-image, content on element and pseudo-elements
  if (el instanceof HTMLElement) {
    try {
      const checkStyleUrls = (computed: CSSStyleDeclaration) => {
        const bg = computed.backgroundImage;
        const mask = computed.maskImage || (computed as any).webkitMaskImage;
        const content = computed.content;

        const checkStr = (str: string, assetType: 'background' | 'image') => {
          if (str && str !== 'none') {
            const matches = str.matchAll(/url\(['"]?([^'"]+)['"]?\)/g);
            for (const match of matches) {
              const rawUrl = match[1];
              if (rawUrl && !rawUrl.startsWith('data:')) {
                const resolved = resolveUrl(rawUrl, pageUrl);
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

        checkStr(bg, 'background');
        checkStr(mask, 'image');
        checkStr(content, 'image');
      };

      const computed = window.getComputedStyle(el);
      checkStyleUrls(computed);

      const before = window.getComputedStyle(el, '::before');
      if (before) checkStyleUrls(before);

      const after = window.getComputedStyle(el, '::after');
      if (after) checkStyleUrls(after);
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
