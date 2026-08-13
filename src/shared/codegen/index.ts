import { ExtractedElement, ComponentExtractionResult, ExportOptions, ExtractedAsset } from '../types';
import { generateHtmlAndCss } from './html-css';
import { generateReactComponent } from './react-gen';
import { generateTailwindJsx } from './tailwind-gen';

export function runFullExtraction(
  rootElement: ExtractedElement,
  repeatedElements: ExtractedElement[] = [],
  options: Partial<ExportOptions> = {}
): ComponentExtractionResult {
  const componentName = options.componentName || 'ExtractedComponent';
  const scopeClassPrefix = options.scopeClassPrefix || 'elementa-scope';

  // 1. Generate HTML + Scoped CSS
  const htmlCss = generateHtmlAndCss(rootElement, scopeClassPrefix);

  // 2. Generate React TSX with inferred dynamic props if repeated
  const reactResult = generateReactComponent(rootElement, repeatedElements, componentName);

  // 3. Generate Tailwind JSX
  const tailwindResult = generateTailwindJsx(rootElement, componentName);

  // 4. Aggregate all assets across tree & repeated instances
  const assetMap = new Map<string, ExtractedAsset>();
  function gatherAssets(el: ExtractedElement) {
    if (el.assets) {
      for (const a of el.assets) {
        if (!assetMap.has(a.resolvedUrl)) {
          assetMap.set(a.resolvedUrl, a);
        }
      }
    }
    if (el.children) {
      for (const c of el.children) gatherAssets(c);
    }
  }

  gatherAssets(rootElement);
  for (const rep of repeatedElements) {
    gatherAssets(rep);
  }

  const allAssets = Array.from(assetMap.values());
  const warnings: string[] = [];

  if (rootElement.isTailwind) {
    warnings.push('Tailwind utility classes detected in component subtree.');
  }

  return {
    rootElement,
    repeatedElements,
    similarCount: repeatedElements.length,
    inferredProps: reactResult.inferredProps,
    allAssets,
    generatedCode: {
      htmlCss,
      reactTsx: {
        code: reactResult.code,
        propsInterface: reactResult.propsInterface,
        sampleData: reactResult.sampleData,
      },
      tailwindJsx: {
        code: tailwindResult.code,
      },
    },
    warnings,
  };
}
