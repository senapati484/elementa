import { ExtractedElement, InferredProp } from '../types';
import { inferPropsFromInstances } from './prop-inference';

// Comprehensive SVG & HTML attribute translation dictionary for React JSX
const JSX_ATTR_MAP: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  crossorigin: 'crossOrigin',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  playsinline: 'playsInline',
  viewbox: 'viewBox',
  fillrule: 'fillRule',
  cliprule: 'clipRule',
  clippath: 'clipPath',
  'clip-path': 'clipPath',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  strokewidth: 'strokeWidth',
  'stroke-width': 'strokeWidth',
  strokelinecap: 'strokeLinecap',
  'stroke-linecap': 'strokeLinecap',
  strokelinejoin: 'strokeLinejoin',
  'stroke-linejoin': 'strokeLinejoin',
  strokemiterlimit: 'strokeMiterlimit',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-opacity': 'strokeOpacity',
  'fill-opacity': 'fillOpacity',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  xmlnsxlink: 'xmlnsXlink',
  'xmlns:xlink': 'xmlnsXlink',
  'xlink:href': 'xlinkHref',
  xlinkhref: 'xlinkHref',
  'accent-height': 'accentHeight',
  'alignment-baseline': 'alignmentBaseline',
  'baseline-shift': 'baselineShift',
  'dominant-baseline': 'dominantBaseline',
  'shape-rendering': 'shapeRendering',
  'color-interpolation': 'colorInterpolation',
  'color-interpolation-filters': 'colorInterpolationFilters',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-style': 'fontStyle',
  'font-weight': 'fontWeight',
  'letter-spacing': 'letterSpacing',
  'text-anchor': 'textAnchor',
  'text-decoration': 'textDecoration',
  'unicode-bidi': 'unicodeBidi',
  'word-spacing': 'wordSpacing',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  minlength: 'minLength',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  contenteditable: 'contentEditable',
};

const SELF_CLOSING_TAGS = new Set([
  'img',
  'input',
  'br',
  'hr',
  'meta',
  'link',
  'path',
  'circle',
  'rect',
  'line',
  'polygon',
  'polyline',
  'stop',
  'use',
  'source',
  'track',
  'area',
  'base',
  'col',
  'embed',
  'param',
  'wbr',
]);

export function generateReactComponent(
  root: ExtractedElement,
  repeatedInstances: ExtractedElement[] = [],
  componentName = 'ExtractedComponent'
): {
  code: string;
  propsInterface: string;
  sampleData: string;
  inferredProps: InferredProp[];
} {
  const isRepeated = repeatedInstances.length > 1;
  const inferredProps = isRepeated ? inferPropsFromInstances(repeatedInstances) : [];

  // Generate TypeScript Interface
  let propsInterface = '';
  if (inferredProps.length > 0) {
    const propLines = inferredProps.map((p) => {
      let tsType = 'string';
      if (p.type === 'number') tsType = 'number';
      if (p.type === 'boolean') tsType = 'boolean';
      return `  ${p.name}?: ${tsType};`;
    });
    propsInterface = `export interface ${componentName}Props {\n${propLines.join('\n')}\n}\n`;
  }

  // Generate Sample Data Array
  let sampleData = '';
  if (inferredProps.length > 0) {
    const items = repeatedInstances.map((_, index) => {
      const entryObj: Record<string, any> = {};
      for (const prop of inferredProps) {
        entryObj[prop.name] = prop.sampleValues[index] || '';
      }
      return `  ${JSON.stringify(entryObj, null, 2).replace(/\n/g, '\n  ')}`;
    });
    sampleData = `export const SAMPLE_${componentName.toUpperCase()}_DATA: ${componentName}Props[] = [\n${items.join(',\n')}\n];\n`;
  }

  const propPathMap = new Map<string, string>();
  for (const p of inferredProps) {
    propPathMap.set(p.path, p.name);
  }

  function renderJsx(el: ExtractedElement, depth: number, currentPath: string): string {
    const indent = '  '.repeat(depth);
    const tag = el.tagName.toLowerCase();
    const isSelfClosing = SELF_CLOSING_TAGS.has(tag) && el.children.length === 0 && !el.textContent;

    const attrEntries: string[] = [];

    // ClassName
    if (el.classList.length > 0) {
      attrEntries.push(`className="${el.classList.join(' ')}"`);
    }

    // Process Attributes
    for (const [rawKey, rawVal] of Object.entries(el.attributes)) {
      if (rawKey === 'class' || rawKey.startsWith('data-elementa')) continue;

      const lowerKey = rawKey.toLowerCase();
      const jsxKey = JSX_ATTR_MAP[lowerKey] || JSX_ATTR_MAP[rawKey] || rawKey;

      // Inline styles string to React style object
      if (lowerKey === 'style' && rawVal) {
        const styleObj = styleStringToJsxObject(rawVal);
        if (styleObj) {
          attrEntries.push(`style={${styleObj}}`);
          continue;
        }
      }

      // Check if this attribute is an inferred prop
      const attrPath = `${currentPath}.attributes.${rawKey}`;
      if (propPathMap.has(attrPath)) {
        const propVar = propPathMap.get(attrPath)!;
        attrEntries.push(`${jsxKey}={${propVar}}`);
      } else {
        // Boolean attributes (e.g. disabled, checked, required)
        if (rawVal === '' || rawVal === 'true' || rawVal === lowerKey) {
          if (['disabled', 'checked', 'readonly', 'required', 'autofocus', 'hidden'].includes(lowerKey)) {
            attrEntries.push(jsxKey);
            continue;
          }
        }
        attrEntries.push(`${jsxKey}="${escapeAttr(rawVal)}"`);
      }
    }

    const attrStr = attrEntries.length > 0 ? ` ${attrEntries.join(' ')}` : '';

    if (isSelfClosing) {
      return `${indent}<${tag}${attrStr} />`;
    }

    // Dynamic text prop
    const textPath = `${currentPath}.textContent`;
    if (propPathMap.has(textPath)) {
      const propVar = propPathMap.get(textPath)!;
      if (el.children.length === 0) {
        return `${indent}<${tag}${attrStr}>{${propVar}}</${tag}>`;
      }
    }

    if (el.children.length === 0) {
      const text = el.textContent ? escapeJsxText(el.textContent.trim()) : '';
      return `${indent}<${tag}${attrStr}>${text}</${tag}>`;
    }

    const childLines = el.children
      .map((child, idx) => renderJsx(child, depth + 1, `${currentPath}.children[${idx}]`))
      .join('\n');

    return `${indent}<${tag}${attrStr}>\n${childLines}\n${indent}</${tag}>`;
  }

  const jsxContent = renderJsx(root, 2, 'root');

  let code = `import React from 'react';\n\n`;

  if (propsInterface) {
    code += `${propsInterface}\n`;
  }

  if (inferredProps.length > 0) {
    const destructuredProps = inferredProps.map((p) => p.name).join(', ');
    code += `export const ${componentName}: React.FC<${componentName}Props> = ({\n  ${destructuredProps}\n}) => {\n  return (\n${jsxContent}\n  );\n};\n\n`;

    code += `${sampleData}\n`;
    code += `// Example list usage:\nexport const ${componentName}List: React.FC = () => {\n  return (\n    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">\n      {SAMPLE_${componentName.toUpperCase()}_DATA.map((item, idx) => (\n        <${componentName} key={idx} {...item} />\n      ))}\n    </div>\n  );\n};\n`;
  } else {
    code += `export const ${componentName}: React.FC = () => {\n  return (\n${jsxContent}\n  );\n};\n`;
  }

  return { code, propsInterface, sampleData, inferredProps };
}

function escapeAttr(val: string): string {
  return val.replace(/"/g, '&quot;');
}

function escapeJsxText(text: string): string {
  return text.replace(/{/g, '{"{"}').replace(/}/g, '{"}"}');
}

function styleStringToJsxObject(styleStr: string): string | null {
  try {
    const entries: string[] = [];
    const declarations = styleStr.split(';').map((s) => s.trim()).filter(Boolean);

    for (const decl of declarations) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) continue;
      const prop = decl.slice(0, colonIdx).trim();
      const val = decl.slice(colonIdx + 1).trim();

      const camelProp = prop.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
      entries.push(`'${camelProp}': '${val.replace(/'/g, "\\'")}'`);
    }

    if (entries.length === 0) return null;
    return `{ ${entries.join(', ')} }`;
  } catch {
    return null;
  }
}
