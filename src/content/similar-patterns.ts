// Similar Pattern Detector for Elementa
// Finds repeating components (cards, list items, grid cells, nav items, etc.)

// Detect and strip hashed class names from CSS-in-JS (Emotion, styled-components, CSS modules)
// e.g. .card__title___3z_1a, .css-175oi2r, .sc-bdVaJa, ._card_x8f19
export function normalizeClassName(cls: string): string {
  if (!cls) return '';
  // Check if fully styled-components / Emotion hash
  if (/^css-[a-zA-Z0-9]+$/.test(cls) || /^sc-[a-zA-Z0-9]+$/.test(cls)) {
    return '';
  }

  // If it has triple underscore (typical webpack css-loader [name]__[local]___[hash]), strip the hash
  if (/_{3,}[a-zA-Z0-9_-]+$/.test(cls)) {
    return cls.replace(/_{3,}[a-zA-Z0-9_-]+$/, '');
  }

  return cls
    .replace(/--[a-zA-Z0-9]{4,}$/, '')
    .replace(/_[a-zA-Z0-9]{5,8}$/, '')
    .trim();
}

export function getElementFingerprint(el: Element): {
  classFingerprint: string;
  structuralFingerprint: string;
  hasMeaningfulClasses: boolean;
} {
  const tag = el.tagName.toLowerCase();
  const rawClasses = Array.from(el.classList || []);
  const normalizedClasses = rawClasses
    .map(normalizeClassName)
    .filter(Boolean)
    .sort();

  const classFingerprint = `${tag}:${normalizedClasses.join('.')}`;
  const parentTag = el.parentElement ? el.parentElement.tagName.toLowerCase() : 'root';
  const childCount = el.children.length;

  // Child tags signature
  const childTags = Array.from(el.children)
    .map((c) => c.tagName.toLowerCase())
    .slice(0, 5)
    .join(',');

  const structuralFingerprint = `${parentTag}>${tag}(children:${childCount}[${childTags}])`;

  return {
    classFingerprint,
    structuralFingerprint,
    hasMeaningfulClasses: normalizedClasses.length > 0,
  };
}

export function findSimilarElements(
  targetEl: Element,
  doc: Document = document,
  maxResults = 50
): Element[] {
  if (!targetEl || targetEl === doc.body || targetEl === doc.documentElement) {
    return [];
  }

  // Never match our own injected overlay roots
  if (targetEl.getAttribute && targetEl.getAttribute('data-elementa-ignore')) {
    return [];
  }

  const { classFingerprint, structuralFingerprint, hasMeaningfulClasses } = getElementFingerprint(targetEl);
  const targetTag = targetEl.tagName.toLowerCase();

  // Query candidate elements with the same tag
  const candidates = Array.from(doc.querySelectorAll(targetTag));
  const matches: Element[] = [];

  for (const candidate of candidates) {
    if (candidate === targetEl) continue;
    if (candidate.getAttribute && candidate.getAttribute('data-elementa-ignore')) continue;
    if (candidate.closest && candidate.closest('#elementa-overlay-root')) continue;

    // Check size visibility
    const rect = candidate.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const candidateFp = getElementFingerprint(candidate);

    if (hasMeaningfulClasses) {
      if (candidateFp.classFingerprint === classFingerprint) {
        matches.push(candidate);
      }
    } else {
      if (candidateFp.structuralFingerprint === structuralFingerprint) {
        matches.push(candidate);
      }
    }

    if (matches.length >= maxResults) break;
  }

  return matches;
}
