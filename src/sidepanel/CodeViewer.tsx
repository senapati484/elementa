import React, { useEffect, useState, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import { Copy, Check, WrapText } from 'lucide-react';

interface CodeViewerProps {
  code: string;
  language: 'tsx' | 'html' | 'css' | 'javascript';
  filename?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ code, language, filename }) => {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);
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

  return (
    <div className="flex flex-col h-full bg-dark-surface border border-dark-border rounded-lg overflow-hidden shadow-inner">
      {/* Code Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-dark-card border-b border-dark-border text-xs text-slate-400">
        <div className="flex items-center gap-2 font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/80 inline-block"></span>
          <span className="font-semibold text-slate-300">{filename || `output.${language}`}</span>
          <span className="text-[10px] text-slate-500">({lineCount} lines)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWrap(!wrap)}
            title="Toggle word wrap"
            className={`p-1.5 rounded hover:bg-slate-700/50 transition ${wrap ? 'text-indigo-400 bg-indigo-950/40' : 'text-slate-400'}`}
          >
            <WrapText size={14} />
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 text-xs font-medium transition active:scale-95"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-400" />
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
      <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-[#0b0d13]">
        <pre className={`m-0 p-0 ${wrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
          <code ref={codeRef} className={`language-${language}`}>
            {code || '// No element selected yet'}
          </code>
        </pre>
      </div>
    </div>
  );
};
