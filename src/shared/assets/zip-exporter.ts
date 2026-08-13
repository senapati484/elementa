import JSZip from 'jszip';
import { ComponentExtractionResult, ExportOptions } from '../types';

export async function exportComponentToZip(
  extraction: ComponentExtractionResult,
  options: ExportOptions
): Promise<Blob> {
  const zip = new JSZip();
  const componentName = options.componentName || 'ExtractedComponent';
  const assetsFolder = zip.folder('assets');

  const assetPathMap = new Map<string, string>();

  // Fetch all assets via background service worker to bypass CORS restrictions
  for (const asset of extraction.allAssets) {
    if (asset.resolvedUrl === 'inline-svg' || asset.resolvedUrl.startsWith('data:')) {
      continue;
    }

    try {
      // Request background service worker to fetch asset with host_permissions
      const resp = await chrome.runtime.sendMessage({
        type: 'FETCH_ASSET_BLOB',
        payload: { url: asset.resolvedUrl },
      });

      if (resp && resp.success && resp.dataUri) {
        const dataUri: string = resp.dataUri;
        const sizeBytes: number = resp.sizeBytes || 0;

        // Inline as base64 if within threshold and option enabled
        if (options.inlineAssets && sizeBytes < options.assetThresholdKb * 1024) {
          assetPathMap.set(asset.resolvedUrl, dataUri);
          asset.dataUri = dataUri;
          asset.isInlined = true;
          continue;
        }

        // Convert base64 back to binary data for ZIP file
        const base64Data = dataUri.split(',')[1];
        if (base64Data && assetsFolder) {
          const filename = asset.filename || `asset-${asset.id}`;
          assetsFolder.file(filename, base64Data, { base64: true });
          assetPathMap.set(asset.resolvedUrl, `./assets/${filename}`);
        }
      }
    } catch (e) {
      console.warn(`[Elementa] Could not fetch ${asset.resolvedUrl}, keeping remote URL:`, e);
      assetPathMap.set(asset.resolvedUrl, asset.resolvedUrl);
    }
  }

  // Rewrite asset paths in all generated code files
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

  // Add files to ZIP
  zip.file(`${componentName}.tsx`, reactCode);
  zip.file('index.html', extraction.generatedCode.htmlCss.fullDoc);
  zip.file('styles.css', cssCode);
  zip.file(`${componentName}.tailwind.tsx`, tailwindCode);

  // Add sample package.json for standalone project usage
  const packageJson = {
    name: componentName.toLowerCase(),
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
    },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
    },
    devDependencies: {
      '@types/react': '^18.3.18',
      '@types/react-dom': '^18.3.5',
      typescript: '^5.7.3',
      vite: '^5.4.14',
    },
  };
  zip.file('package.json', JSON.stringify(packageJson, null, 2));

  // Add README.md with clear instructions
  const readmeContent = `# ${componentName}

Extracted with **Elementa — DOM Component Extractor** on ${new Date().toLocaleString()}.

## Included Files
- \`${componentName}.tsx\`: React Component (TypeScript) with inferred dynamic props
- \`index.html\` & \`styles.css\`: Scoped HTML + CSS
- \`${componentName}.tailwind.tsx\`: Tailwind JSX component
- \`assets/\`: Bundled media assets (${extraction.allAssets.length} assets detected)
- \`package.json\`: Ready-to-run React dependencies

## React Usage
\`\`\`tsx
import React from 'react';
import { ${componentName} } from './${componentName}';

export default function App() {
  return <${componentName} />;
}
\`\`\`
`;
  zip.file('README.md', readmeContent);

  return await zip.generateAsync({ type: 'blob' });
}
