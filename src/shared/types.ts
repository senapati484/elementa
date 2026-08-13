export interface StyleProperty {
  property: string;
  value: string;
  important: boolean;
}

export interface StyleRule {
  selector: string;
  properties: StyleProperty[];
  specificity: number;
  sourceSheet?: string;
}

export interface PseudoRule {
  pseudo: ':hover' | ':focus' | ':active' | '::before' | '::after' | ':visited' | string;
  selector: string;
  properties: StyleProperty[];
}

export interface ElementSummary {
  tagName: string;
  id?: string;
  classList: string[];
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  snippet: string;
  domPath: string;
}

export interface BreadcrumbItem {
  tagName: string;
  id?: string;
  classList: string[];
  domPath: string;
  depth: number;
  isCurrent: boolean;
}

export interface ExtractedAsset {
  id: string;
  type: 'image' | 'svg' | 'font' | 'video' | 'background';
  originalUrl: string;
  resolvedUrl: string;
  filename: string;
  dataUri?: string;
  sizeBytes?: number;
  isInlined: boolean;
  elementTag?: string;
}

export interface InferredProp {
  name: string;
  type: 'string' | 'image' | 'link' | 'boolean' | 'number';
  path: string;
  description?: string;
  sampleValues: (string | boolean | number)[];
}

export interface ExtractedElement {
  id: string;
  tagName: string;
  classList: string[];
  attributes: Record<string, string>;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  matchedRules: StyleRule[];
  pseudoRules: PseudoRule[];
  inlineStyles: Record<string, string>;
  isTailwind: boolean;
  tailwindClasses: string[];
  customClasses: string[];
  textContent: string;
  outerHTML: string;
  children: ExtractedElement[];
  depth: number;
  domPath: string;
  assets: ExtractedAsset[];
}

export interface ComponentExtractionResult {
  rootElement: ExtractedElement;
  repeatedElements?: ExtractedElement[];
  similarCount: number;
  inferredProps: InferredProp[];
  allAssets: ExtractedAsset[];
  generatedCode: {
    htmlCss: {
      html: string;
      css: string;
      fullDoc: string;
      scopeClass: string;
    };
    reactTsx: {
      code: string;
      propsInterface: string;
      sampleData: string;
    };
    tailwindJsx: {
      code: string;
    };
    vueSfc?: {
      code: string;
    };
  };
  warnings: string[];
}

export interface ExportOptions {
  format: 'react-tsx' | 'html-css' | 'tailwind-jsx' | 'vue-sfc';
  scopeClassPrefix: string;
  inlineAssets: boolean;
  assetThresholdKb: number;
  includeTypeScript: boolean;
  componentName: string;
  extractAsRepeated: boolean;
  maxSubtreeDepth: number;
}
