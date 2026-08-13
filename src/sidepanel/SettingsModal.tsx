import React from 'react';
import { ExportOptions } from '../shared/types';
import { X, Sliders, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: ExportOptions;
  onChange: (options: ExportOptions) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onChange,
}) => {
  if (!isOpen) return null;

  const handleChange = (key: keyof ExportOptions, value: any) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-dark-card border border-dark-border rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border bg-dark-surface">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Sliders size={16} className="text-indigo-400" />
            <span>Extraction Settings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          {/* Component Name */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Component Name</label>
            <input
              type="text"
              value={options.componentName}
              onChange={(e) => handleChange('componentName', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* CSS Scoping Prefix */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">CSS Scope Class Prefix</label>
            <input
              type="text"
              value={options.scopeClassPrefix}
              onChange={(e) => handleChange('scopeClassPrefix', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Subtree Max Depth */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-300 font-medium">Max Subtree Depth</label>
              <span className="text-indigo-400 font-mono">{options.maxSubtreeDepth} levels</span>
            </div>
            <input
              type="range"
              min={2}
              max={30}
              value={options.maxSubtreeDepth}
              onChange={(e) => handleChange('maxSubtreeDepth', parseInt(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Inline Assets Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-dark-border">
            <div>
              <div className="text-slate-200 font-medium">Inline Small Assets as Base64</div>
              <div className="text-slate-500 text-[11px]">Converts images under 50KB into data URIs</div>
            </div>
            <input
              type="checkbox"
              checked={options.inlineAssets}
              onChange={(e) => handleChange('inlineAssets', e.target.checked)}
              className="w-4 h-4 accent-indigo-500 cursor-pointer rounded"
            />
          </div>

          {/* Repeated Component Extraction */}
          <div className="flex items-center justify-between pt-2 border-t border-dark-border">
            <div>
              <div className="text-slate-200 font-medium">Auto-infer Repeated Component Props</div>
              <div className="text-slate-500 text-[11px]">Diffs sibling cards to generate typed props</div>
            </div>
            <input
              type="checkbox"
              checked={options.extractAsRepeated}
              onChange={(e) => handleChange('extractAsRepeated', e.target.checked)}
              className="w-4 h-4 accent-indigo-500 cursor-pointer rounded"
            />
          </div>
        </div>

        <div className="px-4 py-3 bg-dark-surface border-t border-dark-border flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-glow"
          >
            <Check size={14} />
            <span>Save & Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
