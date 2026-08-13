import { ExtractedElement, StyleRule, PseudoRule } from '../types';

export function generateHtmlAndCss(
  root: ExtractedElement,
  scopePrefix = 'elementa-scope'
): {
  html: string;
  css: string;
  fullDoc: string;
  scopeClass: string;
} {
  const scopeClass = `${scopePrefix}-${Math.random().toString(36).substring(2, 7)}`;
  const allRules: StyleRule[] = [];
  const allPseudos: PseudoRule[] = [];

  // Collect all rules throughout the subtree
  function collectRules(el: ExtractedElement) {
    if (el.matchedRules) allRules.push(...el.matchedRules);
    if (el.pseudoRules) allPseudos.push(...el.pseudoRules);
    if (el.children) {
      for (const child of el.children) collectRules(child);
    }
  }
  collectRules(root);

  // Clean and deduplicate CSS rules
  const cssRulesMap = new Map<string, Map<string, string>>();

  for (const rule of allRules) {
    const sel = rule.selector;
    if (!cssRulesMap.has(sel)) {
      cssRulesMap.set(sel, new Map());
    }
    const propMap = cssRulesMap.get(sel)!;
    for (const prop of rule.properties) {
      propMap.set(prop.property, `${prop.value}${prop.important ? ' !important' : ''}`);
    }
  }

  // Generate CSS string scoped
  const cssLines: string[] = [];
  cssLines.push(`/* Scoped Styles for ${root.tagName} component */`);

  for (const [sel, props] of cssRulesMap.entries()) {
    if (props.size === 0) continue;
    // Prefix selector with scope wrapper
    const scopedSelector = `.${scopeClass} ${sel}`.trim();
    cssLines.push(`${scopedSelector} {`);
    for (const [prop, val] of props.entries()) {
      cssLines.push(`  ${prop}: ${val};`);
    }
    cssLines.push('}\n');
  }

  // Add pseudo rules
  const pseudoMap = new Map<string, Map<string, string>>();
  for (const pseudo of allPseudos) {
    const sel = pseudo.selector;
    if (!pseudoMap.has(sel)) {
      pseudoMap.set(sel, new Map());
    }
    const pMap = pseudoMap.get(sel)!;
    for (const prop of pseudo.properties) {
      pMap.set(prop.property, `${prop.value}${prop.important ? ' !important' : ''}`);
    }
  }

  for (const [sel, props] of pseudoMap.entries()) {
    if (props.size === 0) continue;
    const scopedSelector = `.${scopeClass} ${sel}`.trim();
    cssLines.push(`${scopedSelector} {`);
    for (const [prop, val] of props.entries()) {
      cssLines.push(`  ${prop}: ${val};`);
    }
    cssLines.push('}\n');
  }

  const css = cssLines.join('\n');

  // Format clean HTML with the scope wrapper class
  function renderHtmlTree(el: ExtractedElement, depth: number, isRoot = false): string {
    const indent = '  '.repeat(depth);
    const tag = el.tagName;
    const isSelfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(tag);

    // Build attributes
    const attrs: string[] = [];
    
    // Classes
    const classes = [...el.classList];
    if (isRoot) {
      classes.unshift(scopeClass);
    }
    if (classes.length > 0) {
      attrs.push(`class="${classes.join(' ')}"`);
    }

    if (el.id) attrs.push(`id="${el.id}"`);

    // Standard attributes
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

    const childLines = el.children.map((c) => renderHtmlTree(c, depth + 1)).join('\n');
    return `${indent}<${tag}${attrStr}>\n${childLines}\n${indent}</${tag}>`;
  }

  const html = renderHtmlTree(root, 0, true);

  const fullDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extracted Component</title>
  <style>
${css}
  </style>
</head>
<body>
${html}
</body>
</html>`;

  return { html, css, fullDoc, scopeClass };
}

function escapeAttr(val: string): string {
  return val.replace(/"/g, '&quot;');
}
