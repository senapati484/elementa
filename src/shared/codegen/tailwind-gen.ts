import { ExtractedElement } from '../types';

export function generateTailwindJsx(
  root: ExtractedElement,
  componentName = 'TailwindComponent'
): { code: string } {
  function renderJsx(el: ExtractedElement, depth: number): string {
    const indent = '  '.repeat(depth);
    const tag = el.tagName.toLowerCase();
    const isSelfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(tag);

    const attrs: string[] = [];

    // Use only classList (which includes Tailwind classes)
    if (el.classList.length > 0) {
      attrs.push(`className="${el.classList.join(' ')}"`);
    }

    if (el.id) {
      attrs.push(`id="${el.id}"`);
    }

    for (const [k, v] of Object.entries(el.attributes)) {
      if (k === 'class' || k === 'id' || k.startsWith('data-elementa')) continue;
      attrs.push(`${k}="${escapeAttr(v)}"`);
    }

    const attrStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';

    if (isSelfClosing) {
      return `${indent}<${tag}${attrStr} />`;
    }

    if (el.children.length === 0) {
      const text = el.textContent ? el.textContent.trim() : '';
      return `${indent}<${tag}${attrStr}>${text}</${tag}>`;
    }

    const childLines = el.children.map((child) => renderJsx(child, depth + 1)).join('\n');
    return `${indent}<${tag}${attrStr}>\n${childLines}\n${indent}</${tag}>`;
  }

  const jsxTree = renderJsx(root, 2);

  const code = `import React from 'react';

export const ${componentName}: React.FC = () => {
  return (
${jsxTree}
  );
};
`;

  return { code };
}

function escapeAttr(val: string): string {
  return val.replace(/"/g, '&quot;');
}
