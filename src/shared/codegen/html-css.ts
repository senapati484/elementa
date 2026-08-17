import { ExtractedElement } from '../types';

export function generateHtmlAndCss(
  root: ExtractedElement,
  scopePrefix = 'elementa-comp'
): {
  html: string;
  css: string;
  fullDoc: string;
  scopeClass: string;
} {
  const scopeId = Math.random().toString(36).substring(2, 7);
  const scopeClass = `${scopePrefix}-${scopeId}`;

  const cssRulesMap = new Map<string, Map<string, string>>();
  let nodeCounter = 0;

  // Process and scope every node in the DOM tree
  function processNode(el: ExtractedElement, isRoot = false): string {
    const nodeId = `${scopeClass}-${nodeCounter++}`;
    const tag = el.tagName.toLowerCase();
    const isSelfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link', 'source'].includes(tag);

    // Collect all resolved properties for this specific element
    const props = new Map<string, string>();

    // 1. Matched CSS rules
    if (el.matchedRules) {
      for (const rule of el.matchedRules) {
        for (const p of rule.properties) {
          if (p.value && p.value.trim()) {
            props.set(p.property, `${p.value}${p.important ? ' !important' : ''}`);
          }
        }
      }
    }

    // 2. Inline styles
    if (el.inlineStyles) {
      for (const [k, v] of Object.entries(el.inlineStyles)) {
        if (v && v.trim()) {
          props.set(k, v.trim());
        }
      }
    }

    if (props.size > 0) {
      cssRulesMap.set(`.${nodeId}`, props);
    }

    // Pseudo rules (hover, focus, active, before, after)
    if (el.pseudoRules) {
      for (const pseudo of el.pseudoRules) {
        const pseudoSel = `.${nodeId}${pseudo.pseudo || ''}`;
        if (!cssRulesMap.has(pseudoSel)) {
          cssRulesMap.set(pseudoSel, new Map());
        }
        const pMap = cssRulesMap.get(pseudoSel)!;
        for (const p of pseudo.properties) {
          pMap.set(p.property, `${p.value}${p.important ? ' !important' : ''}`);
        }
      }
    }

    // Render HTML
    const classes = [nodeId, ...el.classList];
    if (isRoot) {
      classes.unshift(scopeClass);
    }

    const attrs: string[] = [];
    attrs.push(`class="${classes.join(' ')}"`);

    if (el.id) attrs.push(`id="${el.id}"`);

    for (const [k, v] of Object.entries(el.attributes)) {
      if (k === 'class' || k === 'id' || k.startsWith('data-elementa')) continue;
      attrs.push(`${k}="${escapeAttr(v)}"`);
    }

    const attrStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';

    if (isSelfClosing) {
      return `<${tag}${attrStr} />`;
    }

    if (el.children.length === 0) {
      const text = el.textContent ? el.textContent.trim() : '';
      return `<${tag}${attrStr}>${text}</${tag}>`;
    }

    const childHtml = el.children.map((c) => processNode(c, false)).join('\n');
    return `<${tag}${attrStr}>\n${childHtml}\n</${tag}>`;
  }

  const html = processNode(root, true);

  // Generate Scoped CSS string
  const cssLines: string[] = [];
  cssLines.push(`/* Scoped Styles for <${root.tagName}> Component */`);

  for (const [selector, props] of cssRulesMap.entries()) {
    if (props.size === 0) continue;
    cssLines.push(`${selector} {`);
    for (const [prop, val] of props.entries()) {
      cssLines.push(`  ${prop}: ${val};`);
    }
    cssLines.push('}\n');
  }

  const css = cssLines.join('\n');

  // Generate self-contained standalone HTML Document for Live Preview
  const fullDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Elementa Preview</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100%;
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    img, svg, video {
      max-width: 100%;
      display: inline-block;
      vertical-align: middle;
    }
    /* Extracted Component Scoped Styles */
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
