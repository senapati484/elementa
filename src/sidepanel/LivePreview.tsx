import React, { useState } from 'react';
import { Smartphone, Tablet, Monitor, Sun, Moon, Grid, RefreshCw } from 'lucide-react';

interface LivePreviewProps {
  htmlDoc: string;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ htmlDoc }) => {
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'full'>('full');
  const [bgMode, setBgMode] = useState<'dark' | 'light' | 'checker'>('dark');
  const [key, setKey] = useState(0);

  const getWidthStyle = () => {
    if (viewport === 'mobile') return '375px';
    if (viewport === 'tablet') return '600px';
    return '100%';
  };

  const getBgStyle = () => {
    if (bgMode === 'light') return 'bg-white';
    if (bgMode === 'dark') return 'bg-[#0f1117]';
    return 'bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] bg-slate-900';
  };

  return (
    <div className="flex flex-col h-full bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
      {/* Controls Bar */}
      <div className="px-3 py-2 bg-dark-card border-b border-dark-border flex items-center justify-between text-xs text-slate-400">
        {/* Viewport Width Buttons */}
        <div className="flex items-center gap-1 bg-dark-bg p-0.5 rounded-lg border border-dark-border">
          <button
            onClick={() => setViewport('mobile')}
            title="Mobile (375px)"
            className={`p-1 rounded ${viewport === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Smartphone size={13} />
          </button>
          <button
            onClick={() => setViewport('tablet')}
            title="Tablet (600px)"
            className={`p-1 rounded ${viewport === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Tablet size={13} />
          </button>
          <button
            onClick={() => setViewport('full')}
            title="Full Width"
            className={`p-1 rounded ${viewport === 'full' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Monitor size={13} />
          </button>
        </div>

        {/* Background / Theme Buttons */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-dark-bg p-0.5 rounded-lg border border-dark-border">
            <button
              onClick={() => setBgMode('dark')}
              title="Dark Canvas"
              className={`p-1 rounded ${bgMode === 'dark' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Moon size={13} />
            </button>
            <button
              onClick={() => setBgMode('light')}
              title="Light Canvas"
              className={`p-1 rounded ${bgMode === 'light' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Sun size={13} />
            </button>
            <button
              onClick={() => setBgMode('checker')}
              title="Grid Pattern"
              className={`p-1 rounded ${bgMode === 'checker' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Grid size={13} />
            </button>
          </div>

          <button
            onClick={() => setKey((k) => k + 1)}
            title="Reload Preview"
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Sandboxed Iframe Container */}
      <div className={`flex-1 overflow-auto p-4 flex items-start justify-center ${getBgStyle()}`}>
        <div
          style={{ width: getWidthStyle() }}
          className="transition-all duration-200 shadow-2xl rounded-lg overflow-hidden border border-slate-700/40 bg-transparent min-h-[200px]"
        >
          <iframe
            key={key}
            srcDoc={htmlDoc}
            title="Component Live Preview"
            sandbox="allow-scripts"
            className="w-full min-h-[360px] border-none block"
          />
        </div>
      </div>
    </div>
  );
};
