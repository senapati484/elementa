// Background Service Worker for Elementa Chrome Extension

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

// Message router between Side Panel and Content Script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Check message validity
  if (!message || !message.type) return;

  if (message.type === 'PING') {
    sendResponse({ type: 'PONG', payload: { from: 'background' } });
    return false;
  }

  // Handle sidepanel requests that need to route to the active tab's content script
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
          sendResponse({ error: 'No active tab found' });
          return;
        }

        // Try sending message to content script
        try {
          const response = await chrome.tabs.sendMessage(activeTab.id, message);
          sendResponse(response);
        } catch (err: any) {
          // If content script is not yet injected on this page, inject it dynamically
          console.log('[Elementa] Injecting content script into tab:', activeTab.id);
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['src/content/index.ts'],
          });

          // Retry sending message after brief yield
          const retryResponse = await chrome.tabs.sendMessage(activeTab.id, message);
          sendResponse(retryResponse);
        }
      } catch (err: any) {
        console.error('[Elementa] Error routing message to tab:', err);
        sendResponse({ error: err?.message || 'Failed to message content script' });
      }
    })();
    return true; // Keep message channel open for async response
  }

  return false;
});
