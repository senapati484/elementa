import React, { useState, useMemo } from 'react';
import { ExtractedAsset } from '../shared/types';
import { 
  Image as ImageIcon, 
  Film, 
  FileCode, 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  Search, 
  PackageCheck,
  CheckCheck
} from 'lucide-react';

interface AssetListProps {
  assets: ExtractedAsset[];
}

export const AssetList: React.FC<AssetListProps> = ({ assets }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'svg' | 'image' | 'background'>('all');

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        asset.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.resolvedUrl.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (filterType === 'all') return true;
      if (filterType === 'svg') return asset.type === 'svg';
      if (filterType === 'image') return asset.type === 'image';
      if (filterType === 'background') return asset.type === 'background';
      return true;
    });
  }, [assets, searchQuery, filterType]);

  const svgCount = useMemo(() => assets.filter((a) => a.type === 'svg').length, [assets]);
  const imgCount = useMemo(() => assets.filter((a) => a.type === 'image' || a.type === 'background').length, [assets]);

  if (!assets || assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-dark-surface/60 border border-dark-border rounded-xl h-full backdrop-blur-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-3">
          <ImageIcon size={22} className="text-slate-400 opacity-60" />
        </div>
        <p className="text-sm font-semibold text-slate-300">No media assets detected</p>
        <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
          Images, SVGs, background patterns, and video posters in the selected component will appear here.
        </p>
      </div>
    );
  }

  const handleDownloadSingle = async (asset: ExtractedAsset) => {
    try {
      if (asset.resolvedUrl.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = asset.resolvedUrl;
        a.download = asset.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      const resp = await chrome.runtime.sendMessage({
        type: 'FETCH_ASSET_BLOB',
        payload: { url: asset.resolvedUrl },
      });

      if (resp && resp.success && resp.dataUri) {
        const a = document.createElement('a');
        a.href = resp.dataUri;
        a.download = asset.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }
    } catch (e) {
      console.warn('Direct download error:', e);
    }
    window.open(asset.resolvedUrl, '_blank');
  };

  const handleCopyDataUri = async (asset: ExtractedAsset) => {
    try {
      if (asset.resolvedUrl.startsWith('data:')) {
        await navigator.clipboard.writeText(asset.resolvedUrl);
        setCopiedId(asset.id);
        setTimeout(() => setCopiedId(null), 2000);
        return;
      }

      const resp = await chrome.runtime.sendMessage({
        type: 'FETCH_ASSET_BLOB',
        payload: { url: asset.resolvedUrl },
      });

      if (resp && resp.success && resp.dataUri) {
        await navigator.clipboard.writeText(resp.dataUri);
        setCopiedId(asset.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (e) {
      console.warn('Failed to copy data URI:', e);
    }
  };

  const handleCopyAllDataUris = async () => {
    try {
      const dataUriMap: Record<string, string> = {};
      for (const asset of assets) {
        if (asset.resolvedUrl.startsWith('data:')) {
          dataUriMap[asset.filename] = asset.resolvedUrl;
        } else {
          const resp = await chrome.runtime.sendMessage({
            type: 'FETCH_ASSET_BLOB',
            payload: { url: asset.resolvedUrl },
          });
          if (resp && resp.success && resp.dataUri) {
            dataUriMap[asset.filename] = resp.dataUri;
          } else {
            dataUriMap[asset.filename] = asset.resolvedUrl;
          }
        }
      }

      await navigator.clipboard.writeText(JSON.stringify(dataUriMap, null, 2));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (e) {
      console.warn('Failed to copy all data URIs:', e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-surface/80 border border-dark-border rounded-xl overflow-hidden shadow-card backdrop-blur-sm">
      {/* Asset Header Toolbar */}
      <div className="p-3 bg-dark-card/90 border-b border-dark-border flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sparkles size={12} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200">
                Extracted Assets ({assets.length})
              </span>
              <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                {svgCount > 0 && `${svgCount} SVG`}
                {svgCount > 0 && imgCount > 0 && ' · '}
                {imgCount > 0 && `${imgCount} IMG`}
              </span>
            </div>
          </div>

          <button
            onClick={handleCopyAllDataUris}
            title="Copy all assets as JSON map of Data URIs"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition active:scale-95 cursor-pointer"
          >
            {copiedAll ? (
              <>
                <CheckCheck size={12} className="text-emerald-400" />
                <span className="text-emerald-400">Copied All!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex items-center gap-2">
          {assets.length > 4 && (
            <div className="relative flex-1 min-w-0">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 bg-dark-bg/80 border border-dark-border rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          )}

          <div className="flex items-center gap-1 bg-dark-bg/80 p-0.5 rounded-lg border border-dark-border text-[11px]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                filterType === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            {svgCount > 0 && (
              <button
                onClick={() => setFilterType('svg')}
                className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                  filterType === 'svg' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                SVG ({svgCount})
              </button>
            )}
            {imgCount > 0 && (
              <button
                onClick={() => setFilterType('image')}
                className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                  filterType === 'image' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Images ({imgCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Asset Cards Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            No assets match &quot;{searchQuery}&quot;
          </div>
        ) : (
          filteredAssets.map((asset) => {
            const isImage = asset.type === 'image' || asset.type === 'background';
            const isVideo = asset.type === 'video';
            const isSvg = asset.type === 'svg';
            const isCopied = copiedId === asset.id;

            return (
              <div
                key={asset.id}
                className="group flex items-center justify-between p-2.5 bg-dark-card/60 hover:bg-dark-card border border-dark-border/70 hover:border-slate-600/80 rounded-xl gap-3 transition-all duration-150 shadow-sm"
              >
                {/* Visual Thumbnail */}
                <div className="w-11 h-11 rounded-lg bg-[#090b10] border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 p-1 relative shadow-inner">
                  {isSvg ? (
                    <img
                      src={asset.resolvedUrl}
                      alt={asset.filename}
                      className="w-full h-full object-contain filter invert opacity-90 transition-transform group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : isImage ? (
                    <img
                      src={asset.resolvedUrl}
                      alt={asset.filename}
                      className="w-full h-full object-cover rounded-md transition-transform group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : isVideo ? (
                    <Film size={18} className="text-purple-400" />
                  ) : (
                    <FileCode size={18} className="text-emerald-400" />
                  )}
                </div>

                {/* Meta details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition">
                      {asset.filename}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md uppercase font-semibold ${
                        isSvg
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                          : isImage
                          ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {asset.type}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 truncate font-mono mt-0.5" title={asset.resolvedUrl}>
                    {asset.resolvedUrl.startsWith('data:') ? (
                      <span className="text-emerald-400/90 flex items-center gap-1">
                        <PackageCheck size={10} />
                        Self-Contained Vector
                      </span>
                    ) : (
                      asset.resolvedUrl.replace(/^https?:\/\//, '')
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleCopyDataUri(asset)}
                    title="Copy Data URI"
                    className="p-1.5 rounded-lg bg-dark-bg hover:bg-slate-700/80 border border-dark-border text-slate-400 hover:text-indigo-300 transition active:scale-95 cursor-pointer"
                  >
                    {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>

                  <button
                    onClick={() => handleDownloadSingle(asset)}
                    title="Download Asset File"
                    className="p-1.5 rounded-lg bg-dark-bg hover:bg-indigo-600 border border-dark-border hover:border-indigo-500 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
                  >
                    <Download size={13} />
                  </button>

                  {!asset.resolvedUrl.startsWith('data:') && (
                    <a
                      href={asset.resolvedUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Open in new browser tab"
                      className="p-1.5 rounded-lg bg-dark-bg hover:bg-slate-700/80 border border-dark-border text-slate-400 hover:text-white transition active:scale-95"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
