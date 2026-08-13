import { ExtractedElement } from '../types';
import { inferPropsFromInstances } from './prop-inference';

export function generateVueComponent(
  root: ExtractedElement,
  repeatedInstances: ExtractedElement[] = [],
  _componentName = 'ExtractedComponent',
  scopedCss = ''
): { code: string } {
  const isRepeated = repeatedInstances.length > 1;
  const inferredProps = isRepeated ? inferPropsFromInstances(repeatedInstances) : [];

  const propPathMap = new Map<string, string>();
  for (const p of inferredProps) {
    propPathMap.set(p.path, p.name);
  }

  function renderTemplate(el: ExtractedElement, depth: number, currentPath: string): string {
    const indent = '  '.repeat(depth);
    const tag = el.tagName.toLowerCase();
    const isSelfClosing = ['img', 'input', 'br', 'hr', 'source'].includes(tag);

    const attrs: string[] = [];

    if (el.classList.length > 0) {
      attrs.push(`class="${el.classList.join(' ')}"`);
    }

    for (const [k, v] of Object.entries(el.attributes)) {
      if (k === 'class' || k.startsWith('data-elementa')) continue;

      const attrPath = `${currentPath}.attributes.${k}`;
      if (propPathMap.has(attrPath)) {
        const propVar = propPathMap.get(attrPath)!;
        attrs.push(`:${k}="${propVar}"`);
      } else {
        attrs.push(`${k}="${escapeAttr(v)}"`);
      }
    }

    const attrStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';

    if (isSelfClosing) {
      return `${indent}<${tag}${attrStr} />`;
    }

    const textPath = `${currentPath}.textContent`;
    if (propPathMap.has(textPath)) {
      const propVar = propPathMap.get(textPath)!;
      if (el.children.length === 0) {
        return `${indent}<${tag}${attrStr}>{{ ${propVar} }}</${tag}>`;
      }
    }

    if (el.children.length === 0) {
      const text = el.textContent ? el.textContent.trim() : '';
      return `${indent}<${tag}${attrStr}>${text}</${tag}>`;
    }

    const childLines = el.children
      .map((child, idx) => renderTemplate(child, depth + 1, `${currentPath}.children[${idx}]`))
      .join('\n');

    return `${indent}<${tag}${attrStr}>\n${childLines}\n${indent}</${tag}>`;
  }

  const templateContent = renderTemplate(root, 1, 'root');

  // Generate Script Setup block
  let scriptContent = '<script setup lang="ts">\n';
  if (inferredProps.length > 0) {
    const propTypes = inferredProps.map((p) => `  ${p.name}?: ${p.type === 'number' ? 'number' : p.type === 'boolean' ? 'boolean' : 'string'};`).join('\n');
    scriptContent += `interface Props {\n${propTypes}\n}\n\ndefineProps<Props>();\n`;
  }
  scriptContent += '</script>\n\n';

  // Template block
  const fullTemplate = `<template>\n${templateContent}\n</template>\n\n`;

  // Style block
  let styleBlock = '';
  if (scopedCss) {
    const cleanCss = scopedCss.replace(/\.elementa-[a-zA-Z0-9_-]+\s+/g, '');
    styleBlock = `<style scoped>\n${cleanCss}\n</style>\n`;
  }

  return { code: `${scriptContent}${fullTemplate}${styleBlock}` };
}

function escapeAttr(val: string): string {
  return val.replace(/"/g, '&quot;');
}
