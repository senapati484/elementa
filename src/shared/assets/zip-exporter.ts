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

  // Fetch and bundle all assets
  for (const asset of extraction.allAssets) {
    if (!asset.resolvedUrl) continue;

    try {
      let dataUri = asset.dataUri || asset.resolvedUrl;
      let isBase64 = false;

      if (dataUri.startsWith('data:')) {
        isBase64 = true;
      } else {
        const resp = await chrome.runtime.sendMessage({
          type: 'FETCH_ASSET_BLOB',
          payload: { url: asset.resolvedUrl },
        });

        if (resp && resp.success && resp.dataUri) {
          dataUri = resp.dataUri;
          isBase64 = true;
          asset.dataUri = dataUri;
        }
      }

      if (isBase64) {
        // If inline option is enabled, keep as data URI in code
        if (options.inlineAssets) {
          assetPathMap.set(asset.resolvedUrl, dataUri);
          asset.isInlined = true;
        } else {
          // Write to /assets/ folder
          const filename = asset.filename || `asset-${asset.id}.png`;
          const commaIdx = dataUri.indexOf(',');
          if (commaIdx !== -1 && assetsFolder) {
            const rawData = dataUri.slice(commaIdx + 1);
            if (dataUri.startsWith('data:image/svg+xml;utf8,')) {
              // Plain decoded SVG string
              assetsFolder.file(filename, decodeURIComponent(rawData));
            } else {
              // Binary base64
              assetsFolder.file(filename, rawData, { base64: true });
            }
            assetPathMap.set(asset.resolvedUrl, `./assets/${filename}`);
          }
        }
      }
    } catch (e) {
      console.warn(`[Elementa] Could not package asset ${asset.resolvedUrl}:`, e);
      assetPathMap.set(asset.resolvedUrl, asset.resolvedUrl);
    }
  }

  // Rewrite asset paths across all files
  let reactCode = extraction.generatedCode.reactTsx.code;
  let htmlCode = extraction.generatedCode.htmlCss.html;
  let cssCode = extraction.generatedCode.htmlCss.css;
  let tailwindCode = extraction.generatedCode.tailwindJsx.code;
  let vueCode = extraction.generatedCode.vueSfc?.code || '';

  for (const [origUrl, localPath] of assetPathMap.entries()) {
    reactCode = reactCode.replaceAll(origUrl, localPath);
    htmlCode = htmlCode.replaceAll(origUrl, localPath);
    cssCode = cssCode.replaceAll(origUrl, localPath);
    tailwindCode = tailwindCode.replaceAll(origUrl, localPath);
    if (vueCode) {
      vueCode = vueCode.replaceAll(origUrl, localPath);
    }
  }

  // Add files to ZIP
  zip.file(`${componentName}.tsx`, reactCode);
  zip.file('index.html', extraction.generatedCode.htmlCss.fullDoc);
  zip.file('styles.css', cssCode);
  zip.file(`${componentName}.tailwind.tsx`, tailwindCode);
  if (vueCode) {
    zip.file(`${componentName}.vue`, vueCode);
  }

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

  const readmeContent = `# ${componentName}

Extracted with **Elementa — DOM Component Extractor** on ${new Date().toLocaleString()}.

## Included Files
- \`${componentName}.tsx\`: React (TypeScript) Component
- \`${componentName}.vue\`: Vue 3 Single File Component
- \`index.html\` & \`styles.css\`: Scoped HTML + CSS
- \`${componentName}.tailwind.tsx\`: Tailwind JSX Component
- \`assets/\`: Bundled media assets (${extraction.allAssets.length} assets detected)
`;
  zip.file('README.md', readmeContent);

  return await zip.generateAsync({ type: 'blob' });
}
