// Background Service Worker for Elementa Chrome Extension

function isInspectableUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    !lower.startsWith('chrome://') &&
    !lower.startsWith('chrome-extension://') &&
    !lower.startsWith('devtools://') &&
    !lower.startsWith('edge://') &&
    !lower.startsWith('about:') &&
    !lower.startsWith('view-source:') &&
    !lower.includes('chromewebstore.google.com') &&
    !lower.includes('chrome.google.com/webstore')
  );
}

function getExtensionFromMime(mime: string): string {
  if (mime.includes('svg')) return '.svg';
  if (mime.includes('png')) return '.png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  if (mime.includes('avif')) return '.avif';
  if (mime.includes('mp4')) return '.mp4';
  if (mime.includes('webm')) return '.webm';
  if (mime.includes('mp3') || mime.includes('mpeg')) return '.mp3';
  return '.png';
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Elementa] Background service worker active');
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.warn('[Elementa] Failed to set panel behavior:', err));
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.windowId) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (e) {
      console.warn('[Elementa] Could not open sidePanel directly:', e);
    }
  }
});

// Message Router & High-Performance Cross-Origin Asset Fetcher
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return false;

  if (message.type === 'PING') {
    sendResponse({ type: 'PONG', payload: { from: 'background' } });
    return false;
  }

  // Cross-Origin Asset Fetcher (Bypasses CORS via host_permissions: ["<all_urls>"])
  if (message.type === 'FETCH_ASSET_BLOB') {
    (async () => {
      try {
        const url = message.payload?.url;
        if (!url) {
          sendResponse({ success: false, error: 'No URL provided' });
          return;
        }

        // If already a Data URI or inline SVG, return directly
        if (url.startsWith('data:')) {
          sendResponse({
            success: true,
            dataUri: url,
            mimeType: url.split(';')[0].replace('data:', '') || 'image/png',
            sizeBytes: Math.round(url.length * 0.75),
          });
          return;
        }

        const response = await fetch(url, {
          headers: {
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
        });

        if (!response.ok) {
          sendResponse({ success: false, error: `HTTP ${response.status} ${response.statusText}` });
          return;
        }

        const mimeType = response.headers.get('content-type') || 'image/png';
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // Fast chunked base64 encoder
        let binary = '';
        const CHUNK_SIZE = 8192;
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK_SIZE)));
        }

        const base64 = btoa(binary);
        const dataUri = `data:${mimeType};base64,${base64}`;

        sendResponse({
          success: true,
          dataUri,
          mimeType,
          sizeBytes: buffer.byteLength,
          suggestedExtension: getExtensionFromMime(mimeType),
        });
      } catch (err: any) {
        console.warn('[Elementa] Asset fetch error for URL:', message.payload?.url, err);
        sendResponse({ success: false, error: err?.message || 'Fetch failed' });
      }
    })();
    return true;
  }

  // Active Tab Messaging Router
  if (
    message.type === 'START_INSPECT' ||
    message.type === 'STOP_INSPECT' ||
    message.type === 'NAVIGATE_DOM' ||
    message.type === 'DESELECT_ELEMENT' ||
    message.type === 'EXTRACT_COMPONENT' ||
    message.type === 'TOGGLE_SIMILAR_HIGHLIGHT'
  ) {
    (async () => {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab || !activeTab.id) {
          sendResponse({ error: 'NO_ACTIVE_TAB', message: 'No active tab found' });
          return;
        }

        if (!isInspectableUrl(activeTab.url)) {
          sendResponse({
            error: 'RESTRICTED_PAGE',
            message:
              'Chrome blocks extensions on internal browser pages (chrome://) and the Chrome Web Store. Please open any standard website (e.g. github.com, apple.com, google.com).',
          });
          return;
        }

        try {
          const response = await chrome.tabs.sendMessage(activeTab.id, message);
          sendResponse(response);
        } catch (err: any) {
          console.log('[Elementa] Injecting content script into active tab:', activeTab.id);
          const manifest = chrome.runtime.getManifest();
          const scriptFiles = manifest.content_scripts?.[0]?.js || [];

          if (scriptFiles.length > 0) {
            try {
              await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: scriptFiles,
              });

              const retryResponse = await chrome.tabs.sendMessage(activeTab.id, message);
              sendResponse(retryResponse);
              return;
            } catch (injectErr: any) {
              console.warn('[Elementa] Script injection failed:', injectErr);
              sendResponse({
                error: 'INJECTION_FAILED',
                message: 'Could not inject inspector into tab. Please refresh the page.',
              });
              return;
            }
          }

          sendResponse({ error: err?.message || 'Failed to message content script' });
        }
      } catch (err: any) {
        console.error('[Elementa] Error routing message to tab:', err);
        sendResponse({ error: err?.message || 'Failed to message content script' });
      }
    })();
    return true;
  }

  return false;
});
