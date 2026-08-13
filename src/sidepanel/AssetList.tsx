import React from 'react';
import { ExtractedAsset } from '../shared/types';
import { Image, Film, FileCode, Download, ExternalLink } from 'lucide-react';

interface AssetListProps {
  assets: ExtractedAsset[];
}

export const AssetList: React.FC<AssetListProps> = ({ assets }) => {
  if (!assets || assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-dark-surface border border-dark-border rounded-lg h-full">
        <Image size={32} className="mb-2 opacity-40" />
        <p className="text-sm font-medium">No media assets detected</p>
        <p className="text-xs text-slate-600 mt-1">
          Images, SVGs, and videos in the selected component will appear here.
        </p>
      </div>
    );
  }

  const handleDownloadSingle = async (asset: ExtractedAsset) => {
    try {
      const resp = await fetch(asset.resolvedUrl);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = asset.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      window.open(asset.resolvedUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-dark-card border-b border-dark-border flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold text-slate-300">
          Detected Assets ({assets.length})
        </span>
        <span className="text-[11px] text-slate-500">Auto-resolved to absolute URLs</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {assets.map((asset) => {
          const isImage = asset.type === 'image' || asset.type === 'background';
          const isVideo = asset.type === 'video';
          const isSvg = asset.type === 'svg';

          return (
            <div
              key={asset.id}
              className="flex items-center justify-between p-2.5 bg-dark-card/70 hover:bg-dark-card border border-dark-border/80 rounded-lg gap-3 transition"
            >
              {/* Asset Preview Thumbnail */}
              <div className="w-12 h-12 rounded bg-black/40 border border-slate-700/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {isImage && asset.resolvedUrl !== 'inline-svg' ? (
                  <img
                    src={asset.resolvedUrl}
                    alt={asset.filename}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : isVideo ? (
                  <Film size={20} className="text-purple-400" />
                ) : isSvg ? (
                  <FileCode size={20} className="text-emerald-400" />
                ) : (
                  <Image size={20} className="text-indigo-400" />
                )}
              </div>

              {/* Asset Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {asset.filename}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {asset.type}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate font-mono mt-0.5" title={asset.resolvedUrl}>
                  {asset.resolvedUrl}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {asset.resolvedUrl !== 'inline-svg' && (
                  <>
                    <button
                      onClick={() => handleDownloadSingle(asset)}
                      title="Download file"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    >
                      <Download size={14} />
                    </button>
                    <a
                      href={asset.resolvedUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Open in new tab"
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
