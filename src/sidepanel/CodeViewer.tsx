import React, { useEffect, useState, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import { Copy, WrapText, CheckCheck, FileCode } from 'lucide-react';

interface CodeViewerProps {
  code: string;
  language: 'tsx' | 'html' | 'css' | 'javascript';
  filename?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ code, language, filename }) => {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'xs'>('xs');
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const lineCount = code ? code.split('\n').length : 0;
  const byteSize = code ? (new Blob([code]).size / 1024).toFixed(1) : '0';

  return (
    <div className="flex flex-col h-full bg-dark-surface/80 border border-dark-border rounded-xl overflow-hidden shadow-card backdrop-blur-sm">
      {/* Code Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-dark-card/90 border-b border-dark-border text-xs text-slate-400">
        <div className="flex items-center gap-2 font-mono">
          <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <FileCode size={12} />
          </div>
          <span className="font-semibold text-slate-200">{filename || `output.${language}`}</span>
          <span className="text-[10px] text-slate-500 font-normal">
            {lineCount} lines · {byteSize} KB
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Font Size Toggle */}
          <button
            onClick={() => setFontSize(fontSize === 'xs' ? 'sm' : 'xs')}
            title="Toggle font size"
            className="px-1.5 py-0.5 rounded-md bg-dark-bg hover:bg-slate-700/60 text-[10px] font-mono text-slate-400 hover:text-slate-200 border border-dark-border transition cursor-pointer"
          >
            {fontSize === 'xs' ? '12px' : '14px'}
          </button>

          {/* Word Wrap Toggle */}
          <button
            onClick={() => setWrap(!wrap)}
            title="Toggle word wrap"
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              wrap
                ? 'bg-indigo-950 text-indigo-300 border-indigo-700/60'
                : 'bg-dark-bg hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 border-dark-border'
            }`}
          >
            <WrapText size={13} />
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 text-xs font-semibold transition active:scale-95 cursor-pointer"
          >
            {copied ? (
              <>
                <CheckCheck size={12} className="text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <div className={`flex-1 overflow-auto p-3 font-mono bg-[#090b10] ${fontSize === 'sm' ? 'text-sm' : 'text-xs'}`}>
        <pre className={`m-0 p-0 leading-relaxed ${wrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
          <code ref={codeRef} className={`language-${language}`}>
            {code || '// No element selected yet'}
          </code>
        </pre>
      </div>
    </div>
  );
};
