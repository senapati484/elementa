import { StyleProperty, StyleRule, PseudoRule, ExtractedElement, ExtractedAsset } from '../shared/types';

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

  // If at least 50% of classes are Tailwind (or if there are 3+ Tailwind classes)
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

  // Clean selector for counting
  // Replace escaped colons or brackets
  const cleanSelector = selector.replace(/\\./g, '_');

  // Match IDs
  const ids = cleanSelector.match(/#[a-zA-Z0-9_-]+/g);
  if (ids) idCount += ids.length;

  // Match Classes
  const classes = cleanSelector.match(/\.[a-zA-Z0-9_-]+/g);
  if (classes) classCount += classes.length;

  // Match Attribute selectors [type="text"]
  const attrs = cleanSelector.match(/\[[^\]]+\]/g);
  if (attrs) classCount += attrs.length;

  // Match Pseudo-elements (::before, ::after, ::placeholder, etc.)
  const pseudoElements = cleanSelector.match(/::[a-zA-Z0-9_-]+/g);
  if (pseudoElements) tagCount += pseudoElements.length;

  // Match Pseudo-classes (:hover, :focus, :first-child, etc. NOT ::)
  const pseudoClasses = cleanSelector.replace(/::[a-zA-Z0-9_-]+/g, '').match(/:[a-zA-Z0-9_-]+(?:\([^)]*\))?/g);
  if (pseudoClasses) {
    for (const pc of pseudoClasses) {
      if (pc.startsWith(':not(') || pc.startsWith(':is(') || pc.startsWith(':has(')) {
        // Pseudo functions: handled recursively or simplified
        classCount += 1;
      } else {
        classCount += 1;
      }
    }
  }

  // Match Tags
  // Remove IDs, classes, attrs, pseudos, combinators
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

// Pseudo selector detection and stripping
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

// Extract matched rules across all loaded stylesheets
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

  let styleSheets: CSSStyleSheet[] = [];
  try {
    styleSheets = Array.from(doc.styleSheets || []);
  } catch (e) {
    return { matchedRules, pseudoRules, skippedSheetsCount: 1 };
  }

  for (let sIdx = 0; sIdx < styleSheets.length; sIdx++) {
    const sheet = styleSheets[sIdx];
    let cssRules: CSSRuleList;
    try {
      cssRules = sheet.cssRules;
      if (!cssRules) continue;
    } catch (e) {
      // CORS-restricted external stylesheet (e.g. Google Fonts or CDN)
      skippedSheetsCount++;
      continue;
    }

    try {
      scanRules(cssRules, el, sheet.href || `stylesheet-${sIdx}`, matchedRules, pseudoRules);
    } catch (e) {
      console.warn('[Elementa] Error parsing CSS rules:', e);
    }
  }

  return { matchedRules, pseudoRules, skippedSheetsCount };
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

    // Handle @media / @supports / @layer grouping rules
    if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules) {
      scanRules((rule as CSSGroupingRule).cssRules, el, sourceSheet, matchedRules, pseudoRules);
      continue;
    }

    if (rule.type !== CSSRule.STYLE_RULE) continue;
    const styleRule = rule as CSSStyleRule;
    const selectorText = styleRule.selectorText;
    if (!selectorText) continue;

    // Split multiple comma-separated selectors (e.g. .btn, .button)
    const subSelectors = selectorText.split(',').map((s) => s.trim());

    for (const subSelector of subSelectors) {
      const { baseSelector, pseudo } = parsePseudoSelector(subSelector);

      if (pseudo) {
        // Check if base element matches the base selector
        let baseMatches = false;
        try {
          if (baseSelector === '*' || el.matches(baseSelector)) {
            baseMatches = true;
          }
        } catch {
          baseMatches = false;
        }

        if (baseMatches) {
          const properties = extractRuleProperties(styleRule.style);
          if (properties.length > 0) {
            pseudoRules.push({
              pseudo: pseudo as any,
              selector: subSelector,
              properties,
            });
          }
        }
      } else {
        // Direct element match check
        let matches = false;
        try {
          matches = el.matches(subSelector);
        } catch {
          matches = false;
        }

        if (matches) {
          const specificity = calculateSpecificity(subSelector);
          const properties = extractRuleProperties(styleRule.style);
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

function extractRuleProperties(style: CSSStyleDeclaration): StyleProperty[] {
  const properties: StyleProperty[] = [];
  if (!style) return properties;

  for (let i = 0; i < style.length; i++) {
    const propName = style[i];
    const value = style.getPropertyValue(propName);
    const priority = style.getPropertyPriority(propName);
    if (value && value.trim()) {
      properties.push({
        property: propName,
        value: value.trim(),
        important: priority === 'important',
      });
    }
  }
  return properties;
}

// Cascade resolution and property deduplication
export function resolveCascadeProperties(
  matchedRules: StyleRule[],
  inlineStyle: CSSStyleDeclaration | Record<string, string>
): Map<string, { value: string; selector: string; important: boolean }> {
  // Map of propertyName -> winning definition
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
        // Cascade rules:
        // 1. !important always beats non-!important
        // 2. Higher specificity wins
        // 3. If equal specificity, later source index wins
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

  // Merge inline styles (inline specificity is 1000)
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

  // Return clean map
  const cleanResult = new Map<string, { value: string; selector: string; important: boolean }>();
  for (const [k, v] of resolved.entries()) {
    cleanResult.set(k, { value: v.value, selector: v.selector, important: v.important });
  }

  return cleanResult;
}

// Recursive Element Extractor with depth/node limit
export function extractElementTree(
  rootEl: Element,
  maxNodes = 300,
  maxDepth = 20
): ExtractedElement {
  let totalNodes = 0;

  function traverse(el: Element, depth: number): ExtractedElement {
    totalNodes++;
    const tagName = el.tagName.toLowerCase();
    const classList = Array.from(el.classList || []);
    const { tailwindClasses, customClasses, isTailwindElement } = classifyClasses(classList);

    // Attributes map
    const attributes: Record<string, string> = {};
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      if (attr.name.startsWith('data-elementa')) continue; // skip our own injected flags
      attributes[attr.name] = attr.value;
    }

    // Extract matched stylesheet rules and pseudos
    const { matchedRules, pseudoRules } = extractMatchedRules(el);

    // Inline styles record
    const inlineStyles: Record<string, string> = {};
    if (el instanceof HTMLElement && el.style) {
      for (let i = 0; i < el.style.length; i++) {
        const prop = el.style[i];
        inlineStyles[prop] = el.style.getPropertyValue(prop);
      }
    }

    // Direct text content (without recursive child node text)
    let textContent = '';
    for (const childNode of Array.from(el.childNodes)) {
      if (childNode.nodeType === Node.TEXT_NODE && childNode.textContent?.trim()) {
        textContent += childNode.textContent.trim() + ' ';
      }
    }
    textContent = textContent.trim();

    // Assets scanning for this element
    const assets: ExtractedAsset[] = scanElementAssets(el);

    const rect = el.getBoundingClientRect();
    const rectData = {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };

    // Calculate DOM Path for breadcrumb/debugging
    const domPath = getElementDOMPath(el);

    // Recursively extract children up to limit
    const children: ExtractedElement[] = [];
    if (depth < maxDepth && totalNodes < maxNodes) {
      // Check for Shadow DOM root
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
      if (current.className && typeof current.className === 'string') {
        const first = current.className.trim().split(/\s+/)[0];
        if (first && !first.includes(':') && !first.includes('/')) {
          selector += `.${first}`;
        }
      }
      parts.unshift(selector);
    }
    current = current.parentElement;
  }

  return parts.join(' > ') || el.tagName.toLowerCase();
}

function scanElementAssets(el: Element): ExtractedAsset[] {
  const assets: ExtractedAsset[] = [];
  const origin = window.location.origin;

  // Check <img> src
  if (el.tagName.toLowerCase() === 'img') {
    const src = el.getAttribute('src');
    if (src) {
      const resolved = resolveUrl(src, origin);
      assets.push({
        id: `img-${Math.random().toString(36).substring(2, 9)}`,
        type: 'image',
        originalUrl: src,
        resolvedUrl: resolved,
        filename: extractFilenameFromUrl(resolved, 'image.png'),
        isInlined: false,
        elementTag: 'img',
      });
    }
  }

  // Check <video> src / poster
  if (el.tagName.toLowerCase() === 'video') {
    const src = el.getAttribute('src');
    const poster = el.getAttribute('poster');
    if (src) {
      const resolved = resolveUrl(src, origin);
      assets.push({
        id: `video-${Math.random().toString(36).substring(2, 9)}`,
        type: 'video',
        originalUrl: src,
        resolvedUrl: resolved,
        filename: extractFilenameFromUrl(resolved, 'video.mp4'),
        isInlined: false,
        elementTag: 'video',
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

  // Check SVG elements
  if (el.tagName.toLowerCase() === 'svg') {
    assets.push({
      id: `svg-${Math.random().toString(36).substring(2, 9)}`,
      type: 'svg',
      originalUrl: 'inline-svg',
      resolvedUrl: 'inline-svg',
      filename: 'icon.svg',
      isInlined: true,
      elementTag: 'svg',
    });
  }

  // Check background-image in inline style or computed style
  if (el instanceof HTMLElement) {
    const bg = el.style.backgroundImage || window.getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none') {
      const urlMatch = bg.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith('data:')) {
        const resolved = resolveUrl(urlMatch[1], origin);
        assets.push({
          id: `bg-${Math.random().toString(36).substring(2, 9)}`,
          type: 'background',
          originalUrl: urlMatch[1],
          resolvedUrl: resolved,
          filename: extractFilenameFromUrl(resolved, 'bg-image.png'),
          isInlined: false,
          elementTag: el.tagName.toLowerCase(),
        });
      }
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
    const name = pathname.split('/').pop();
    if (name && name.includes('.')) return name;
    return fallback;
  } catch {
    return fallback;
  }
}
