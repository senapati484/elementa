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

// Configure side panel behavior: open side panel on extension icon click
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Elementa] Background service worker installed');
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.warn('[Elementa] Failed to set panel behavior:', err));
});

// Fallback listener for action clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.windowId) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (e) {
      console.warn('[Elementa] Could not open sidePanel directly:', e);
    }
  }
});

// Message router & Cross-Origin Asset Fetcher
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return false;

  if (message.type === 'PING') {
    sendResponse({ type: 'PONG', payload: { from: 'background' } });
    return false;
  }

  // Cross-Origin Asset Fetcher (bypasses CORS restrictions using host_permissions)
  if (message.type === 'FETCH_ASSET_BLOB') {
    (async () => {
      try {
        const url = message.payload?.url;
        if (!url) {
          sendResponse({ success: false, error: 'No URL provided' });
          return;
        }

        const response = await fetch(url);
        if (!response.ok) {
          sendResponse({ success: false, error: `HTTP ${response.status} ${response.statusText}` });
          return;
        }

        const blob = await response.blob();
        const mimeType = blob.type || 'application/octet-stream';
        
        // Convert blob to base64 data URI
        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({
            success: true,
            dataUri: reader.result as string,
            mimeType,
            sizeBytes: blob.size,
          });
        };
        reader.onerror = () => {
          sendResponse({ success: false, error: 'Failed to convert blob to data URI' });
        };
        reader.readAsDataURL(blob);
      } catch (err: any) {
        console.warn('[Elementa] Background fetch failed for URL:', message.payload?.url, err);
        sendResponse({ success: false, error: err?.message || 'Network fetch failed' });
      }
    })();
    return true; // Keep channel open for async response
  }

  // Handle sidepanel requests that route to active tab content script
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

        // Try sending message to content script
        try {
          const response = await chrome.tabs.sendMessage(activeTab.id, message);
          sendResponse(response);
        } catch (err: any) {
          // If content script was not yet injected on an existing tab before extension was installed, inject it
          console.log('[Elementa] Injecting content script into active tab:', activeTab.id);
          const manifest = chrome.runtime.getManifest();
          const scriptFiles = manifest.content_scripts?.[0]?.js || [];

          if (scriptFiles.length > 0) {
            try {
              await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: scriptFiles,
              });

              // Give script a moment to initialize and retry
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
    return true; // Keep channel open for async response
  }

  return false;
});
