import { ExtractedElement, InferredProp } from '../types';
import { inferPropsFromInstances } from './prop-inference';

// Map HTML attribute names to React JSX property names
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
  strokewidth: 'strokeWidth',
  strokelinecap: 'strokeLinecap',
  strokelinejoin: 'strokeLinejoin',
  strokemiterlimit: 'strokeMiterlimit',
  xmlnsxlink: 'xmlnsXlink',
};

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

  // Generate Sample Data Array if repeated
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

  // Create JSX template generator
  const propPathMap = new Map<string, string>();
  for (const p of inferredProps) {
    propPathMap.set(p.path, p.name);
  }

  function renderJsx(el: ExtractedElement, depth: number, currentPath: string): string {
    const indent = '  '.repeat(depth);
    const tag = el.tagName.toLowerCase();
    const isSelfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(tag);

    // Build JSX attributes
    const attrEntries: string[] = [];

    // ClassName
    if (el.classList.length > 0) {
      attrEntries.push(`className="${el.classList.join(' ')}"`);
    }

    // Other attributes
    for (const [k, v] of Object.entries(el.attributes)) {
      if (k === 'class' || k.startsWith('data-elementa')) continue;
      const jsxKey = JSX_ATTR_MAP[k.toLowerCase()] || k;

      // Check if this attribute is an inferred dynamic prop
      const attrPath = `${currentPath}.attributes.${k}`;
      if (propPathMap.has(attrPath)) {
        const propVar = propPathMap.get(attrPath)!;
        attrEntries.push(`${jsxKey}={${propVar}}`);
      } else {
        attrEntries.push(`${jsxKey}="${escapeAttr(v)}"`);
      }
    }

    const attrStr = attrEntries.length > 0 ? ` ${attrEntries.join(' ')}` : '';

    if (isSelfClosing) {
      return `${indent}<${tag}${attrStr} />`;
    }

    // Check if text content is dynamic prop
    const textPath = `${currentPath}.textContent`;
    if (propPathMap.has(textPath)) {
      const propVar = propPathMap.get(textPath)!;
      if (el.children.length === 0) {
        return `${indent}<${tag}${attrStr}>{${propVar}}</${tag}>`;
      }
    }

    if (el.children.length === 0) {
      const text = el.textContent ? el.textContent.trim() : '';
      return `${indent}<${tag}${attrStr}>${text}</${tag}>`;
    }

    const childLines = el.children
      .map((child, idx) => renderJsx(child, depth + 1, `${currentPath}.children[${idx}]`))
      .join('\n');

    return `${indent}<${tag}${attrStr}>\n${childLines}\n${indent}</${tag}>`;
  }

  const jsxContent = renderJsx(root, 2, 'root');

  // Assemble Complete Code
  let code = `import React from 'react';\n\n`;

  if (propsInterface) {
    code += `${propsInterface}\n`;
  }

  if (inferredProps.length > 0) {
    const destructuredProps = inferredProps.map((p) => p.name).join(', ');
    code += `export const ${componentName}: React.FC<${componentName}Props> = ({\n  ${destructuredProps}\n}) => {\n  return (\n${jsxContent}\n  );\n};\n\n`;

    code += `${sampleData}\n`;
    code += `// Example usage in a list/grid:\nexport const ${componentName}List: React.FC = () => {\n  return (\n    <div className="grid gap-4">\n      {SAMPLE_${componentName.toUpperCase()}_DATA.map((item, idx) => (\n        <${componentName} key={idx} {...item} />\n      ))}\n    </div>\n  );\n};\n`;
  } else {
    code += `export const ${componentName}: React.FC = () => {\n  return (\n${jsxContent}\n  );\n};\n`;
  }

  return { code, propsInterface, sampleData, inferredProps };
}

function escapeAttr(val: string): string {
  return val.replace(/"/g, '&quot;');
}
