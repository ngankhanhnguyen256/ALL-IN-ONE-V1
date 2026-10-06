import React, { useState } from 'react';
import { Download, Link as LinkIcon, Video as VideoIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { VideoClip } from '../types';
import { cn } from '../lib/utils';

interface LeftColumnProps {
  sourceVideoUrl: string | null;
  onDownloadSource: (url: string) => Promise<void>;
  clips: VideoClip[];
  onDeleteClip: (id: string) => void;
  workerStatus: string;
  isWorkerReady: boolean;
  isExtracting: boolean;
}

export function LeftColumn({ sourceVideoUrl, onDownloadSource, clips, onDeleteClip, workerStatus, isWorkerReady, isExtracting }: LeftColumnProps) {
  const [url, setUrl] = useState('');

  const handleDownload = async () => {
    if (!url) return;
    await onDownloadSource(url);
  };

  const handleDownloadAllClips = () => {
    clips.forEach((clip, index) => {
      const a = document.createElement('a');
      a.href = clip.url;
      a.download = `clip_${index + 1}_${clip.originalStart}-${clip.originalEnd}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0F1219] w-full">
      <div className="p-4 border-b border-white/5">
        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 block">
          Video Source URL
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://tiktok.com/v/..."
            className="flex-1 bg-[#1A1F26] border border-white/10 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleDownload}
            disabled={!url || isExtracting || !isWorkerReady}
            className="bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center min-w-[70px]"
          >
            {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
          </button>
        </div>
        {(!isWorkerReady || isExtracting) && (
          <div className="mt-3 flex items-center gap-2 text-[10px] text-indigo-400 font-mono bg-indigo-500/10 p-2 rounded border border-indigo-500/20">
             <Loader2 className="w-3 h-3 animate-spin" />
             <span className="truncate">{workerStatus}</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <VideoIcon className="w-3.5 h-3.5" /> Exported Clips ({clips.length})
          </h3>
          {clips.length > 0 && (
            <button
              onClick={handleDownloadAllClips}
              className="text-[10px] text-indigo-400 hover:underline"
            >
              Download All
            </button>
          )}
        </div>
        
        {clips.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-sm border-2 border-dashed border-white/5 rounded-lg">
            No exported clips
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-2">
            {clips.map((clip, idx) => (
              <div key={clip.id} className="group relative bg-[#1A1F26] rounded-lg border border-white/5 p-2 hover:border-indigo-500/50 transition-all">
                <div className="rounded mb-2 overflow-hidden relative bg-black/20">
                   <video controls src={clip.url} className="w-full h-auto max-h-[200px] object-contain block" />
                   <div className="absolute top-2 right-2 pointer-events-none">
                     <span className="text-[10px] font-mono bg-black/80 px-1.5 py-0.5 rounded text-slate-300">
                       {clip.originalStart.toFixed(1)}s - {clip.originalEnd.toFixed(1)}s
                     </span>
                   </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate pr-4 text-slate-300">Clip_{idx + 1}.mp4</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = clip.url;
                        a.download = `clip_${idx + 1}_${clip.originalStart}-${clip.originalEnd}.mp4`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="w-5 h-5 rounded bg-slate-700 hover:bg-indigo-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-slate-200" />
                    </button>
                    <button 
                      onClick={() => onDeleteClip(clip.id)}
                      className="w-5 h-5 rounded bg-slate-700 hover:bg-red-500 flex items-center justify-center transition-colors cursor-pointer"
                      title="Xóa clip"
                    >
                      <span className="text-slate-200 text-xs font-bold leading-none mb-[1px]">✕</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
