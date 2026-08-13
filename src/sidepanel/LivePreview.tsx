import React, { useState } from 'react';
import { Smartphone, Tablet, Monitor, Sun, Moon, Grid, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

interface LivePreviewProps {
  htmlDoc: string;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ htmlDoc }) => {
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'full'>('full');
  const [bgMode, setBgMode] = useState<'dark' | 'light' | 'grid' | 'checker'>('dark');
  const [scale, setScale] = useState<number>(1);
  const [key, setKey] = useState(0);

  const getWidthStyle = () => {
    if (viewport === 'mobile') return '375px';
    if (viewport === 'tablet') return '640px';
    return '100%';
  };

  const getBgStyle = () => {
    if (bgMode === 'light') return 'bg-white';
    if (bgMode === 'dark') return 'bg-[#090b10]';
    if (bgMode === 'grid') return 'bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950';
    return 'bg-[conic-gradient(#1e293b_90deg,#0f172a_90deg_180deg,#1e293b_180deg_270deg,#0f172a_270deg)] [background-size:24px_24px]';
  };

  return (
    <div className="flex flex-col h-full bg-dark-surface/80 border border-dark-border rounded-xl overflow-hidden shadow-card backdrop-blur-sm">
      {/* Top Preview Controls Bar */}
      <div className="px-3 py-2 bg-dark-card/90 border-b border-dark-border flex items-center justify-between text-xs text-slate-400">
        {/* Device Viewport Selector */}
        <div className="flex items-center gap-1 bg-dark-bg/80 p-0.5 rounded-lg border border-dark-border">
          <button
            onClick={() => setViewport('mobile')}
            title="Mobile View (375px)"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              viewport === 'mobile' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone size={12} />
            <span className="hidden sm:inline">375px</span>
          </button>
          <button
            onClick={() => setViewport('tablet')}
            title="Tablet View (640px)"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              viewport === 'tablet' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tablet size={12} />
            <span className="hidden sm:inline">640px</span>
          </button>
          <button
            onClick={() => setViewport('full')}
            title="Full Width View (100%)"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              viewport === 'full' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor size={12} />
            <span className="hidden sm:inline">100%</span>
          </button>
        </div>

        {/* Studio Background & Zoom Controls */}
        <div className="flex items-center gap-1.5">
          {/* Zoom Buttons */}
          <div className="flex items-center bg-dark-bg/80 p-0.5 rounded-lg border border-dark-border text-[11px] font-mono">
            <button
              onClick={() => setScale((s) => Math.max(0.6, Math.round((s - 0.1) * 10) / 10))}
              title="Zoom out"
              className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ZoomOut size={12} />
            </button>
            <span className="px-1 text-slate-300 min-w-[32px] text-center font-semibold">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(1.4, Math.round((s + 0.1) * 10) / 10))}
              title="Zoom in"
              className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ZoomIn size={12} />
            </button>
          </div>

          {/* Theme Mode Toggle */}
          <div className="flex items-center gap-0.5 bg-dark-bg/80 p-0.5 rounded-lg border border-dark-border">
            <button
              onClick={() => setBgMode('dark')}
              title="Dark Studio"
              className={`p-1 rounded-md transition cursor-pointer ${
                bgMode === 'dark' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon size={12} />
            </button>
            <button
              onClick={() => setBgMode('light')}
              title="Light Studio"
              className={`p-1 rounded-md transition cursor-pointer ${
                bgMode === 'light' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun size={12} />
            </button>
            <button
              onClick={() => setBgMode('grid')}
              title="Dot Grid Pattern"
              className={`p-1 rounded-md transition cursor-pointer ${
                bgMode === 'grid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid size={12} />
            </button>
          </div>

          <button
            onClick={() => setKey((k) => k + 1)}
            title="Reload Preview Frame"
            className="p-1.5 rounded-lg bg-dark-bg hover:bg-slate-700/60 border border-dark-border text-slate-400 hover:text-white transition cursor-pointer active:rotate-180 duration-300"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Sandboxed Interactive Frame Area */}
      <div className={`flex-1 overflow-auto p-4 flex items-start justify-center transition-colors duration-200 ${getBgStyle()}`}>
        <div
          style={{
            width: getWidthStyle(),
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
          className={`transition-all duration-200 shadow-2xl rounded-xl overflow-hidden border border-slate-700/50 bg-transparent min-h-[220px] ${
            viewport === 'mobile' ? 'ring-8 ring-slate-800/80' : ''
          }`}
        >
          <iframe
            key={key}
            srcDoc={htmlDoc}
            title="Component Live Preview"
            sandbox="allow-scripts"
            className="w-full min-h-[380px] border-none block bg-transparent"
          />
        </div>
      </div>
    </div>
  );
};
