import React, { useState, useEffect } from 'react';
import { 
  ElementSummary, 
  BreadcrumbItem, 
  ComponentExtractionResult, 
  ExportOptions 
} from '../shared/types';
import { ExtensionMessage } from '../shared/messages';
import { CodeViewer } from './CodeViewer';
import { AssetList } from './AssetList';
import { SettingsModal } from './SettingsModal';
import { exportComponentToZip } from '../shared/assets/zip-exporter';
import { 
  MousePointer, 
  Layers, 
  Download, 
  Copy, 
  Check, 
  Sliders, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Code, 
  FileText, 
  Sparkles, 
  Image, 
  RefreshCw,
  Zap
} from 'lucide-react';

const DEFAULT_OPTIONS: ExportOptions = {
  format: 'react-tsx',
  scopeClassPrefix: 'elementa-comp',
  inlineAssets: false,
  assetThresholdKb: 50,
  includeTypeScript: true,
  componentName: 'ExtractedCard',
  extractAsRepeated: true,
  maxSubtreeDepth: 15,
};

export default function App() {
  const [isInspecting, setIsInspecting] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<ElementSummary | null>(null);
  const [hoverSummary, setHoverSummary] = useState<ElementSummary | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [similarCount, setSimilarCount] = useState(0);
  const [highlightSimilar, setHighlightSimilar] = useState(true);
  const [hasParent, setHasParent] = useState(false);
  const [hasChildren, setHasChildren] = useState(false);

  const [activeTab, setActiveTab] = useState<'react' | 'html-css' | 'tailwind' | 'assets'>('react');
  const [extractionResult, setExtractionResult] = useState<ComponentExtractionResult | null>(null);
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_OPTIONS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Show transient toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Message listener from content script
  useEffect(() => {
    const handleMessage = (message: ExtensionMessage) => {
      if (!message || !message.type) return;

      switch (message.type) {
        case 'ELEMENT_HOVERED': {
          setHoverSummary(message.payload.summary);
          setSimilarCount(message.payload.similarCount || 0);
          break;
        }

        case 'ELEMENT_SELECTED': {
          setSelectedSummary(message.payload.summary);
          setBreadcrumbs(message.payload.breadcrumbs);
          setSimilarCount(message.payload.similarCount || 0);
          setHasParent(message.payload.hasParent);
          setHasChildren(message.payload.hasChildren);
          // Automatically trigger component extraction
          triggerExtraction(options);
          break;
        }

        case 'EXTRACTION_RESULT': {
          setExtractionResult(message.payload.result);
          break;
        }

        case 'INSPECTION_STATUS_CHANGED': {
          setIsInspecting(message.payload.isInspecting);
          if (!message.payload.hasSelection) {
            setSelectedSummary(null);
            setBreadcrumbs([]);
          }
          break;
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [options]);

  const toggleInspect = async () => {
    const nextState = !isInspecting;
    setIsInspecting(nextState);

    try {
      await chrome.runtime.sendMessage({
        type: nextState ? 'START_INSPECT' : 'STOP_INSPECT',
        payload: { options },
      });
    } catch (e) {
      console.warn('Could not toggle inspector directly:', e);
    }
  };

  const triggerExtraction = async (currentOpts: ExportOptions) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'EXTRACT_COMPONENT',
        payload: { options: currentOpts },
      });
      if (response && response.result) {
        setExtractionResult(response.result);
      }
    } catch (e) {
      console.warn('Extraction request error:', e);
    }
  };

  const handleNavigateDom = async (
    direction: 'parent' | 'child' | 'breadcrumb-select',
    targetPath?: string
  ) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'NAVIGATE_DOM',
        payload: { direction, targetPath },
      });
    } catch (e) {
      console.warn('Failed to navigate DOM:', e);
    }
  };

  const handleDeselect = async () => {
    setSelectedSummary(null);
    setBreadcrumbs([]);
    setExtractionResult(null);
    try {
      await chrome.runtime.sendMessage({
        type: 'DESELECT_ELEMENT',
        payload: {},
      });
    } catch (e) {
      console.warn('Failed to deselect:', e);
    }
  };

  const handleToggleSimilar = async (enabled: boolean) => {
    setHighlightSimilar(enabled);
    try {
      await chrome.runtime.sendMessage({
        type: 'TOGGLE_SIMILAR_HIGHLIGHT',
        payload: { enabled },
      });
    } catch (e) {
      console.warn('Failed to toggle similar highlight:', e);
    }
  };

  const handleCopyCurrentCode = async () => {
    if (!extractionResult) return;

    let codeToCopy = '';
    if (activeTab === 'react') {
      codeToCopy = extractionResult.generatedCode.reactTsx.code;
    } else if (activeTab === 'html-css') {
      codeToCopy = extractionResult.generatedCode.htmlCss.fullDoc;
    } else if (activeTab === 'tailwind') {
      codeToCopy = extractionResult.generatedCode.tailwindJsx.code;
    }

    if (codeToCopy) {
      try {
        await navigator.clipboard.writeText(codeToCopy);
        setCopied(true);
        showToast('Code copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  const handleDownloadZip = async () => {
    if (!extractionResult) return;

    try {
      setIsExportingZip(true);
      const zipBlob = await exportComponentToZip(extractionResult, options);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${options.componentName || 'component'}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Component .ZIP bundle downloaded!');
    } catch (err) {
      console.error('ZIP export error:', err);
      showToast('Export failed: check console');
    } finally {
      setIsExportingZip(false);
    }
  };

  // Current displayed summary (selected has priority over hover)
  

  return (
    <div className="flex flex-col h-screen w-full bg-dark-bg text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between px-3.5 py-2.5 bg-dark-surface border-b border-dark-border z-20">
        <div className="flex items-center gap-2">
          {/* Logo Prism */}
          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-400 p-[1px] shadow-glow flex items-center justify-center">
            <div className="w-full h-full bg-dark-bg rounded-[3px] flex items-center justify-center">
              <Layers size={13} className="text-indigo-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>Elementa</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 font-mono font-normal border border-indigo-800/40">
                v1.0
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Settings & Options"
            className="p-1.5 rounded-lg bg-dark-card hover:bg-slate-700/60 text-slate-400 hover:text-white border border-dark-border transition"
          >
            <Sliders size={14} />
          </button>

          {/* Inspect Mode Toggle Button */}
          <button
            onClick={toggleInspect}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
              isInspecting
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow-teal ring-2 ring-emerald-400/40'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-glow'
            }`}
          >
            <MousePointer size={13} className={isInspecting ? 'animate-pulse text-emerald-200' : ''} />
            <span>{isInspecting ? 'Inspecting' : 'Inspect'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-0 p-3 gap-2.5 overflow-hidden">
        {/* Active Inspection Bar & Breadcrumbs */}
        <section className="bg-dark-surface border border-dark-border rounded-lg p-2.5 flex flex-col gap-2 shadow-sm">
          {/* Summary Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-2 h-2 rounded-full ${
                  selectedSummary
                    ? 'bg-emerald-400 ring-2 ring-emerald-400/30'
                    : isInspecting
                    ? 'bg-indigo-400 animate-ping'
                    : 'bg-slate-600'
                }`}
              />
              <div className="text-xs truncate">
                {selectedSummary ? (
                  <span className="font-semibold text-emerald-300">
                    Selected: &lt;{selectedSummary.tagName}&gt;
                    {selectedSummary.id ? `#${selectedSummary.id}` : ''}
                  </span>
                ) : hoverSummary ? (
                  <span className="text-indigo-300">
                    Hovering: &lt;{hoverSummary.tagName}&gt;
                    {hoverSummary.id ? `#${hoverSummary.id}` : ''}
                  </span>
                ) : isInspecting ? (
                  <span className="text-slate-400 animate-pulse">Hover over elements in page...</span>
                ) : (
                  <span className="text-slate-500">Click &quot;Inspect&quot; to begin selection</span>
                )}
              </div>
            </div>

            {/* DOM Walk Actions */}
            {selectedSummary && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleNavigateDom('parent')}
                  disabled={!hasParent}
                  title="Select Parent Element (ArrowUp)"
                  className="p-1 rounded bg-dark-card hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-dark-card text-slate-300 transition"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => handleNavigateDom('child')}
                  disabled={!hasChildren}
                  title="Select Child Element (ArrowDown)"
                  className="p-1 rounded bg-dark-card hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-dark-card text-slate-300 transition"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  onClick={handleDeselect}
                  title="Deselect (Escape)"
                  className="p-1 rounded bg-dark-card hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Breadcrumb Trail */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto py-1 px-1 bg-dark-bg/60 rounded border border-dark-border/60 text-[11px] font-mono scrollbar-none">
              {breadcrumbs.map((b, idx) => (
                <React.Fragment key={b.domPath || idx}>
                  {idx > 0 && <span className="text-slate-600">&gt;</span>}
                  <button
                    onClick={() => handleNavigateDom('breadcrumb-select', b.domPath)}
                    className={`px-1.5 py-0.5 rounded transition truncate max-w-[120px] ${
                      b.isCurrent
                        ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-700/60'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {b.tagName}
                    {b.classList[0] ? `.${b.classList[0]}` : ''}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Similar Count Badge / Quick Toggle */}
          {similarCount > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-dark-border/50 text-[11px]">
              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                <Sparkles size={13} className="text-amber-400" />
                <span>Found {similarCount} similar component instances</span>
              </div>
              <label className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={highlightSimilar}
                  onChange={(e) => handleToggleSimilar(e.target.checked)}
                  className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                />
                <span>Highlight</span>
              </label>
            </div>
          )}
        </section>

        {/* Code Generation Tabs */}
        <div className="flex items-center justify-between border-b border-dark-border pb-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('react')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'react'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-surface'
              }`}
            >
              <Code size={13} />
              <span>React (TSX)</span>
            </button>

            <button
              onClick={() => setActiveTab('html-css')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'html-css'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-surface'
              }`}
            >
              <FileText size={13} />
              <span>HTML+CSS</span>
            </button>

            <button
              onClick={() => setActiveTab('tailwind')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'tailwind'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-surface'
              }`}
            >
              <Zap size={13} />
              <span>Tailwind</span>
            </button>

            <button
              onClick={() => setActiveTab('assets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'assets'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-surface'
              }`}
            >
              <Image size={13} />
              <span>Assets ({extractionResult?.allAssets?.length || 0})</span>
            </button>
          </div>

          {/* Refresh extraction */}
          {selectedSummary && (
            <button
              onClick={() => triggerExtraction(options)}
              title="Re-extract component"
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-dark-surface transition"
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>

        {/* Code / Content Viewer Area */}
        <div className="flex-1 min-h-0">
          {!extractionResult ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-dark-surface border border-dark-border rounded-lg text-slate-500">
              <Layers size={36} className="mb-3 text-slate-600 opacity-60" />
              <p className="text-sm font-semibold text-slate-400">Ready to Extract</p>
              <p className="text-xs text-slate-600 mt-1 max-w-[240px]">
                Click <span className="text-indigo-400 font-semibold">&quot;Inspect&quot;</span> and select any element on the page to view clean generated code.
              </p>
            </div>
          ) : activeTab === 'react' ? (
            <CodeViewer
              code={extractionResult.generatedCode.reactTsx.code}
              language="tsx"
              filename={`${options.componentName || 'Component'}.tsx`}
            />
          ) : activeTab === 'html-css' ? (
            <CodeViewer
              code={extractionResult.generatedCode.htmlCss.fullDoc}
              language="html"
              filename="index.html"
            />
          ) : activeTab === 'tailwind' ? (
            <CodeViewer
              code={extractionResult.generatedCode.tailwindJsx.code}
              language="tsx"
              filename={`${options.componentName || 'Component'}.tailwind.tsx`}
            />
          ) : (
            <AssetList assets={extractionResult.allAssets} />
          )}
        </div>
      </div>

      {/* Footer Action Bar */}
      {extractionResult && (
        <footer className="p-3 bg-dark-surface border-t border-dark-border flex items-center justify-between gap-2 z-20">
          <button
            onClick={handleCopyCurrentCode}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow transition active:scale-95"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-300" />
                <span>Copied Code!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isExportingZip}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-dark-card hover:bg-slate-700/80 text-slate-200 border border-dark-border text-xs font-semibold transition active:scale-95 disabled:opacity-50"
          >
            <Download size={14} className={isExportingZip ? 'animate-bounce' : ''} />
            <span>{isExportingZip ? 'Packaging...' : 'Download .ZIP'}</span>
          </button>
        </footer>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 bg-slate-900/95 border border-indigo-500/40 text-indigo-200 text-xs font-medium rounded-full shadow-2xl backdrop-blur-md animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        options={options}
        onChange={(newOpts) => {
          setOptions(newOpts);
          if (selectedSummary) {
            triggerExtraction(newOpts);
          }
        }}
      />
    </div>
  );
}
