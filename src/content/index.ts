import { InspectorManager } from './inspector';
import { ExtensionMessage } from '../shared/messages';

declare global {
  interface Window {
    __ELEMENTA_INSPECTOR__?: InspectorManager;
  }
}

// Single instance guard
if (!window.__ELEMENTA_INSPECTOR__) {
  console.log('[Elementa] Content script loaded and active');
  window.__ELEMENTA_INSPECTOR__ = new InspectorManager();
}

const inspector = window.__ELEMENTA_INSPECTOR__;

// Listen for commands from Side Panel & Background
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (!message || !message.type) return;

  switch (message.type) {
    case 'PING': {
      sendResponse({ type: 'PONG', payload: { from: 'content' } });
      break;
    }

    case 'START_INSPECT': {
      inspector.start();
      sendResponse({ success: true, status: 'inspecting' });
      break;
    }

    case 'STOP_INSPECT': {
      inspector.stop();
      sendResponse({ success: true, status: 'stopped' });
      break;
    }

    case 'DESELECT_ELEMENT': {
      inspector.deselect();
      sendResponse({ success: true });
      break;
    }

    case 'NAVIGATE_DOM': {
      const payload = message.payload;
      if (payload.direction === 'parent') {
        inspector.navigateParent();
      } else if (payload.direction === 'child') {
        inspector.navigateChild();
      } else if (payload.direction === 'breadcrumb-select' && payload.targetPath) {
        inspector.navigateBreadcrumb(payload.targetPath);
      }
      sendResponse({ success: true });
      break;
    }

    case 'TOGGLE_SIMILAR_HIGHLIGHT': {
      inspector.toggleSimilarHighlight(message.payload.enabled);
      sendResponse({ success: true });
      break;
    }

    case 'EXTRACT_COMPONENT': {
      const result = inspector.extract(message.payload.options);
      sendResponse({ success: !!result, result });
      break;
    }
  }

  return true;
});
