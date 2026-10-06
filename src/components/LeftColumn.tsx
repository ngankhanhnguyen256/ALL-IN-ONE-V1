import React, { useState, useRef } from 'react';
import { Download, Link as LinkIcon, Video as VideoIcon, Loader2, Upload, Sparkles, CheckCircle2, AlertCircle, FileVideo } from 'lucide-react';
import { VideoClip } from '../types';
import { cn } from '../lib/utils';

interface LeftColumnProps {
  sourceVideoUrl: string | null;
  onDownloadSource: (url: string) => Promise<void>;
  onUploadLocalVideo: (file: File) => Promise<void>;
  clips: VideoClip[];
  onDeleteClip: (id: string) => void;
  statusMessage: string;
  isExtracting: boolean;
}

export function LeftColumn({
  sourceVideoUrl,
  onDownloadSource,
  onUploadLocalVideo,
  clips,
  onDeleteClip,
  statusMessage,
  isExtracting
}: LeftColumnProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'upload'>('link');
  const [url, setUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = async () => {
    if (!url.trim()) return;
    await onDownloadSource(url.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && url.trim() && !isExtracting) {
      handleDownload();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUploadLocalVideo(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      await onUploadLocalVideo(file);
    }
  };

  const handleDownloadAllClips = () => {
    clips.forEach((clip, index) => {
      const a = document.createElement('a');
      a.href = clip.url;
      a.download = `clip_${index + 1}_${clip.originalStart.toFixed(1)}-${clip.originalEnd.toFixed(1)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0F1219] w-full border-r border-white/5">
      {/* Tab Switcher: Link vs Upload */}
      <div className="p-3 border-b border-white/5 bg-[#141822]">
        <div className="flex bg-[#0B0E14] p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setActiveTab('link')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
              activeTab === 'link'
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Dán Link</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
              activeTab === 'upload'
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải Video Lên</span>
          </button>
        </div>
      </div>

      {/* Input Section */}
      <div className="p-4 border-b border-white/5 bg-[#0F1219]">
        {activeTab === 'link' ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <LinkIcon className="w-3 h-3 text-indigo-400" /> URL Video Nguồn
              </label>
              <span className="text-[10px] text-slate-500 font-mono">TikTok / Douyin / YT / MP4</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://www.tiktok.com/@... hoặc link video"
                disabled={isExtracting}
                className="flex-1 bg-[#1A1F26] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
              />
              <button
                onClick={handleDownload}
                disabled={!url.trim() || isExtracting}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-3.5 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-[76px] text-white shadow-md shadow-indigo-900/20 cursor-pointer shrink-0"
              >
                {isExtracting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  'Lấy Video'
                )}
              </button>
            </div>

            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Hỗ trợ link rút gọn: vt.tiktok, vm.tiktok...</span>
              <button
                type="button"
                onClick={() => setUrl('https://www.w3schools.com/html/mov_bbb.mp4')}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-mono cursor-pointer"
              >
                Link mẫu thử
              </button>
            </div>
          </div>
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2",
                isDragging
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-white/10 hover:border-indigo-500/50 hover:bg-white/5 bg-[#141822]"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <FileVideo className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">Nhấp để chọn video từ máy</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Hoặc kéo thả file .mp4, .mov, .webm vào đây</p>
              </div>
            </div>
          </div>
        )}

        {/* Live Status Indicator */}
        {(isExtracting || statusMessage) && (
          <div className={cn(
            "mt-3 flex items-center gap-2 text-[11px] font-mono p-2.5 rounded-lg border transition-all",
            isExtracting 
              ? "text-indigo-300 bg-indigo-950/40 border-indigo-500/30" 
              : statusMessage.includes('Lỗi') || statusMessage.includes('thất bại')
                ? "text-rose-300 bg-rose-950/30 border-rose-500/30"
                : "text-emerald-300 bg-emerald-950/30 border-emerald-500/30"
          )}>
            {isExtracting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-indigo-400" />
            ) : statusMessage.includes('Lỗi') || statusMessage.includes('thất bại') ? (
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            )}
            <span className="truncate leading-tight">{statusMessage || (isExtracting ? 'Đang xử lý...' : 'Sẵn sàng')}</span>
          </div>
        )}
      </div>

      {/* Exported Clips Section */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <VideoIcon className="w-3.5 h-3.5 text-indigo-400" /> Clips Đã Cắt ({clips.length})
          </h3>
          {clips.length > 0 && (
            <button
              onClick={handleDownloadAllClips}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              Tải Tất Cả
            </button>
          )}
        </div>
        
        {clips.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-600 text-xs border-2 border-dashed border-white/5 rounded-xl">
            <VideoIcon className="w-8 h-8 text-slate-700 mb-2" />
            <p className="font-medium text-slate-500">Chưa có clip nào được cắt</p>
            <p className="text-[10px] text-slate-600 mt-1 max-w-[200px]">
              Tải video, chọn các đoạn thời gian ở cột giữa và bấm "Execute Server Cut".
            </p>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-1">
            {clips.map((clip, idx) => (
              <div key={clip.id} className="group relative bg-[#1A1F26] rounded-xl border border-white/5 p-2.5 hover:border-indigo-500/50 transition-all shadow-sm">
                <div className="rounded-lg mb-2 overflow-hidden relative bg-black/40">
                   <video controls src={clip.url} className="w-full h-auto max-h-[160px] object-contain block" />
                   <div className="absolute top-2 right-2 pointer-events-none">
                     <span className="text-[10px] font-mono bg-black/80 px-1.5 py-0.5 rounded text-slate-300 backdrop-blur-sm border border-white/10">
                       {clip.originalStart.toFixed(1)}s - {clip.originalEnd.toFixed(1)}s
                     </span>
                   </div>
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-medium truncate pr-2 text-slate-300 font-mono">Clip_{idx + 1}.mp4</span>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = clip.url;
                        a.download = `clip_${idx + 1}_${clip.originalStart.toFixed(1)}-${clip.originalEnd.toFixed(1)}.mp4`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="w-6 h-6 rounded-md bg-slate-800 hover:bg-indigo-600 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                      title="Tải clip về máy"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => onDeleteClip(clip.id)}
                      className="w-6 h-6 rounded-md bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      title="Xóa clip"
                    >
                      <span className="text-xs font-bold leading-none">✕</span>
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
