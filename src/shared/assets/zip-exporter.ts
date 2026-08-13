import JSZip from 'jszip';
import { ComponentExtractionResult, ExportOptions } from '../types';

export async function exportComponentToZip(
  extraction: ComponentExtractionResult,
  options: ExportOptions
): Promise<Blob> {
  const zip = new JSZip();
  const componentName = options.componentName || 'ExtractedComponent';
  const assetsFolder = zip.folder('assets');

  // Map of originalUrl/resolvedUrl -> local relative path
  const assetPathMap = new Map<string, string>();

  // Fetch & bundle assets
  for (const asset of extraction.allAssets) {
    if (asset.resolvedUrl === 'inline-svg' || asset.resolvedUrl.startsWith('data:')) {
      continue;
    }

    try {
      // Attempt to fetch asset blob
      const response = await fetch(asset.resolvedUrl, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        
        // If below threshold and inlining is enabled, convert to data URI
        if (options.inlineAssets && blob.size < options.assetThresholdKb * 1024) {
          const dataUri = await blobToDataUri(blob);
          assetPathMap.set(asset.resolvedUrl, dataUri);
          asset.dataUri = dataUri;
          asset.isInlined = true;
          continue;
        }

        // Otherwise write to /assets/
        const filename = asset.filename || `asset-${asset.id}`;
        if (assetsFolder) {
          assetsFolder.file(filename, blob);
        }
        assetPathMap.set(asset.resolvedUrl, `./assets/${filename}`);
      }
    } catch (e) {
      console.warn(`[Elementa] CORS/Network issue fetching ${asset.resolvedUrl}, keeping remote URL:`, e);
      assetPathMap.set(asset.resolvedUrl, asset.resolvedUrl);
    }
  }

  // Rewrite asset paths in generated code
  let reactCode = extraction.generatedCode.reactTsx.code;
  let htmlCode = extraction.generatedCode.htmlCss.html;
  let cssCode = extraction.generatedCode.htmlCss.css;
  let tailwindCode = extraction.generatedCode.tailwindJsx.code;

  for (const [origUrl, localPath] of assetPathMap.entries()) {
    reactCode = reactCode.replaceAll(origUrl, localPath);
    htmlCode = htmlCode.replaceAll(origUrl, localPath);
    cssCode = cssCode.replaceAll(origUrl, localPath);
    tailwindCode = tailwindCode.replaceAll(origUrl, localPath);
  }

  // Add files to ZIP root
  zip.file(`${componentName}.tsx`, reactCode);
  zip.file('index.html', extraction.generatedCode.htmlCss.fullDoc);
  zip.file('styles.css', cssCode);
  zip.file(`${componentName}.tailwind.tsx`, tailwindCode);

  // Add README.md
  const readmeContent = `# ${componentName}

Extracted with **Elementa — DOM Component Extractor** on ${new Date().toLocaleString()}.

## Included Formats
- \`${componentName}.tsx\`: React / TypeScript component with inferred props
- \`index.html\` & \`styles.css\`: Scoped HTML + CSS
- \`${componentName}.tailwind.tsx\`: Tailwind CSS variant
- \`assets/\`: Bundled media assets (${extraction.allAssets.length} assets detected)

## Quick Start
\`\`\`bash
# React
import { ${componentName} } from './${componentName}';
\`\`\`
`;
  zip.file('README.md', readmeContent);

  return await zip.generateAsync({ type: 'blob' });
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
