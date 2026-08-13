import { ExtractedElement, InferredProp } from '../types';

export function inferPropsFromInstances(instances: ExtractedElement[]): InferredProp[] {
  if (instances.length <= 1) return [];

  const props: InferredProp[] = [];
  

  // Helper to traverse nodes in lockstep
  function diffTrees(
    nodes: ExtractedElement[],
    pathPrefix: string,
    nodeName: string
  ) {
    if (nodes.length === 0) return;
    const first = nodes[0];

    // Check text content differences
    const textValues = nodes.map((n) => n.textContent?.trim() || '');
    const hasUniqueTexts = new Set(textValues).size > 1;
    const allHaveText = textValues.some((t) => t.length > 0);

    if (hasUniqueTexts && allHaveText) {
      const propName = generatePropName(first, nodeName, 'text');
      props.push({
        name: propName,
        type: 'string',
        path: `${pathPrefix}.textContent`,
        sampleValues: textValues,
      });
    }

    // Check image src differences
    if (first.tagName === 'img') {
      const srcValues = nodes.map((n) => n.attributes.src || '');
      if (new Set(srcValues).size > 1 && srcValues.some((s) => s.length > 0)) {
        props.push({
          name: generatePropName(first, nodeName, 'imageSrc'),
          type: 'image',
          path: `${pathPrefix}.attributes.src`,
          sampleValues: srcValues,
        });
      }

      const altValues = nodes.map((n) => n.attributes.alt || '');
      if (new Set(altValues).size > 1 && altValues.some((a) => a.length > 0)) {
        props.push({
          name: generatePropName(first, nodeName, 'imageAlt'),
          type: 'string',
          path: `${pathPrefix}.attributes.alt`,
          sampleValues: altValues,
        });
      }
    }

    // Check <a> href differences
    if (first.tagName === 'a') {
      const hrefValues = nodes.map((n) => n.attributes.href || '');
      if (new Set(hrefValues).size > 1 && hrefValues.some((h) => h.length > 0)) {
        props.push({
          name: generatePropName(first, nodeName, 'linkHref'),
          type: 'link',
          path: `${pathPrefix}.attributes.href`,
          sampleValues: hrefValues,
        });
      }
    }

    // Recurse children if counts match
    const minChildCount = Math.min(...nodes.map((n) => n.children?.length || 0));
    for (let cIdx = 0; cIdx < minChildCount; cIdx++) {
      const childGroup = nodes.map((n) => n.children[cIdx]);
      const childTag = first.children[cIdx]?.tagName || `node${cIdx}`;
      diffTrees(childGroup, `${pathPrefix}.children[${cIdx}]`, `${nodeName}_${childTag}`);
    }
  }

  diffTrees(instances, 'root', 'item');

  // Deduplicate prop names
  const seen = new Set<string>();
  return props.map((p) => {
    let name = p.name;
    let counter = 2;
    while (seen.has(name)) {
      name = `${p.name}${counter++}`;
    }
    seen.add(name);
    return { ...p, name };
  });
}

function generatePropName(el: ExtractedElement, context: string, fieldType: string): string {
  if (el.id) {
    return toCamelCase(`${el.id}_${fieldType}`);
  }

  const customClass = el.customClasses[0];
  if (customClass) {
    return toCamelCase(`${customClass}_${fieldType}`);
  }

  if (fieldType === 'imageSrc') return 'imageUrl';
  if (fieldType === 'imageAlt') return 'imageAlt';
  if (fieldType === 'linkHref') return 'href';
  if (el.tagName === 'h1' || el.tagName === 'h2' || el.tagName === 'h3') return 'title';
  if (el.tagName === 'p') return 'description';
  if (el.tagName === 'button' || el.tagName === 'a') return 'buttonText';
  if (el.tagName === 'span') return 'label';

  return toCamelCase(`${context}_${fieldType}`);
}

function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .split('_')
    .filter(Boolean)
    .map((word, i) => (i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join('');
}
