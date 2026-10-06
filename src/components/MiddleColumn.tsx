import React, { useRef, useState, useEffect } from 'react';
import { ClipRange, VideoClip } from '../types';
import { Scissors, Plus, Play, Pause, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface MiddleColumnProps {
  sourceVideoUrl: string | null;
  directVideoUrl?: string | null;
  localFile?: File | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  clipRanges: ClipRange[];
  setClipRanges: React.Dispatch<React.SetStateAction<ClipRange[]>>;
  onCutComplete: (clips: VideoClip[]) => void;
  isExtracting?: boolean;
  statusMessage?: string;
}

interface ClipRowProps {
  range: ClipRange;
  idx: number;
  updateRange: (id: string, s: number, e: number) => void;
  removeRange: (id: string) => void;
  duration: number;
  onPreview: (start: number) => void;
}

const ClipRow: React.FC<ClipRowProps> = ({
  range,
  idx,
  updateRange,
  removeRange,
  duration,
  onPreview
}) => {
    const [startStr, setStartStr] = useState(range.startTime.toString());
    const [endStr, setEndStr] = useState(range.endTime.toString());
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (parseFloat(startStr) !== range.startTime && !isNaN(range.startTime)) {
            setStartStr(range.startTime.toString());
        }
        if (parseFloat(endStr) !== range.endTime && !isNaN(range.endTime)) {
            setEndStr(range.endTime.toString());
        }
    }, [range.startTime, range.endTime]);

    const handleChange = (type: 'start' | 'end', val: string) => {
        if (type === 'start') setStartStr(val);
        else setEndStr(val);
        
        const sStr = type === 'start' ? val : startStr;
        const eStr = type === 'end' ? val : endStr;
        
        const s = parseFloat(sStr);
        const e = parseFloat(eStr);

        if (isNaN(s) || isNaN(e)) {
            setError("Vui lòng nhập số.");
            return;
        }
        if (s >= e) {
            setError("End Time phải lớn hơn Start.");
            return;
        }
        setError(null);
        updateRange(range.id, s, e);
    };

    return (
        <div className="flex flex-col gap-1">
            <div className="relative bg-slate-900/50 rounded-lg border border-white/5 p-2 flex items-center gap-4 group hover:border-indigo-500/30 transition-colors">
                <span className="text-slate-600 font-mono text-[10px] w-4 font-bold">{idx + 1}.</span>
                
                <div className="flex-1 flex items-center gap-2">
                    <input 
                        type="number" 
                        value={startStr}
                        step="0.1"
                        onChange={(e) => handleChange('start', e.target.value)}
                        className={cn("w-20 bg-[#1A1F26] border rounded px-2 py-1 text-xs text-slate-300 focus:outline-none", error ? "border-red-500 focus:border-red-500" : "border-white/10 focus:border-indigo-500")}
                    />
                    <span className="text-slate-600">-</span>
                    <input 
                        type="number" 
                        value={endStr}
                        step="0.1"
                        onChange={(e) => handleChange('end', e.target.value)}
                        className={cn("w-20 bg-[#1A1F26] border rounded px-2 py-1 text-xs text-slate-300 focus:outline-none", error ? "border-red-500 focus:border-red-500" : "border-white/10 focus:border-indigo-500")}
                    />
                </div>

                <button 
                    onClick={() => onPreview(range.startTime)}
                    className="text-[10px] text-indigo-400 font-bold px-2 py-1 uppercase tracking-wider hover:text-indigo-300"
                >
                    Preview
                </button>
                
                <button 
                    onClick={() => removeRange(range.id)}
                    className="text-slate-600 hover:text-red-400 px-2 py-1 text-xs font-bold"
                >
                    ✕
                </button>
            </div>
            {error && <span className="text-[10px] text-red-400 font-medium px-2">{error}</span>}
        </div>
    );
};

export function MiddleColumn({
  sourceVideoUrl,
  directVideoUrl,
  localFile,
  videoRef,
  clipRanges,
  setClipRanges,
  onCutComplete,
  isExtracting,
  statusMessage
}: MiddleColumnProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isProcessingCut, setIsProcessingCut] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [cutStatus, setCutStatus] = useState<string>('');
  const [cutError, setCutError] = useState<string | null>(null);
  const messageRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    setVideoError(null);
    setCutError(null);
  }, [sourceVideoUrl]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setVideoError(null);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch((err) => {
          console.warn("Video play interrupted:", err);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const addClipRange = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    // default range: currentTime to currentTime + 5, bounded by duration
    const start = Math.max(0, currentTime);
    const end = Math.min(duration || 10, start + 5);
    setClipRanges([...clipRanges, { id: newId, startTime: start, endTime: end }]);
  };

  const updateClipRange = (id: string, field: 'startTime' | 'endTime', value: number) => {
    setClipRanges(
      clipRanges.map((r) => {
        if (r.id === id) {
          const newVal = Math.max(0, Math.min(duration, value));
          let { startTime, endTime } = r;
          if (field === 'startTime') {
             startTime = Math.min(newVal, endTime - 0.5); // min 0.5s duration
          } else {
             endTime = Math.max(newVal, startTime + 0.5);
          }
          return { ...r, startTime, endTime };
        }
        return r;
      })
    );
  };

  const removeClipRange = (id: string) => {
    setClipRanges(clipRanges.filter((r) => r.id !== id));
  };

  const executeCut = async () => {
    if (!sourceVideoUrl || clipRanges.length === 0) return;
    setIsProcessingCut(true);
    setCutError(null);
    setCutStatus(`Đang chuẩn bị cắt ${clipRanges.length} đoạn video...`);

    try {
      let fileIdToUse: string | undefined = undefined;

      // If local file was uploaded, upload once to server
      if (localFile) {
        setCutStatus('Đang nạp video nguồn lên máy chủ...');
        const formData = new FormData();
        formData.append('video', localFile);
        const upRes = await fetch('/api/upload-video', {
          method: 'POST',
          body: formData
        });
        if (!upRes.ok) {
          const errData = await upRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Không thể tải file lên máy chủ.');
        }
        const upData = await upRes.json();
        fileIdToUse = upData.fileId;
      }

      setCutStatus(`Đang cắt ${clipRanges.length} clips bằng FFmpeg siêu tốc...`);

      const res = await fetch('/api/cut-video-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: directVideoUrl || (sourceVideoUrl.startsWith('http') && !sourceVideoUrl.startsWith('blob:') ? sourceVideoUrl : undefined),
          fileId: fileIdToUse,
          ranges: clipRanges
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server cắt video trả về lỗi HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.clips || data.clips.length === 0) {
        throw new Error('Máy chủ không trả về đoạn clip nào.');
      }

      setCutStatus(`Đã cắt thành công ${data.clips.length} đoạn!`);
      onCutComplete(data.clips);
    } catch (error: any) {
      console.error("Error during video cut:", error);
      setCutError(error.message || "Đã xảy ra lỗi khi cắt video.");
    } finally {
      setIsProcessingCut(false);
    }
  };

  return (
    <div className="flex-1 p-6 flex flex-col h-full bg-[#0B0E14]">
      {/* Video Player */}
      <div className="relative flex-1 bg-black rounded-xl border border-white/5 shadow-2xl flex items-center justify-center group overflow-hidden mb-6 min-h-[300px]">
        {sourceVideoUrl && (
          <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono border border-white/10 z-20">PREVIEW MODE</div>
        )}
        {sourceVideoUrl && !videoError ? (
          <video
            ref={videoRef}
            src={sourceVideoUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={(e) => {
              console.error("Video player load error:", e);
              setVideoError("Không thể phát luồng video trực tiếp. Bạn có thể chọn tab 'Tải Video Lên' để tải file MP4.");
            }}
            controls
            playsInline
          />
        ) : isExtracting ? (
          <div className="w-full h-full flex items-center justify-center text-indigo-400 flex-col gap-3 p-6 text-center">
             <div className="relative">
               <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
               <div className="absolute inset-0 rounded-full blur-sm bg-indigo-500/20 animate-pulse"></div>
             </div>
             <div className="space-y-1">
               <p className="text-sm font-semibold text-slate-200">Đang nạp video nguồn...</p>
               <p className="text-xs font-mono text-indigo-400 max-w-sm">{statusMessage || 'Đang bóc tách luồng dữ liệu...'}</p>
             </div>
          </div>
        ) : videoError ? (
          <div className="w-full h-full flex items-center justify-center text-rose-400 flex-col gap-3 p-6 text-center">
             <AlertCircle className="w-10 h-10 text-rose-500" />
             <p className="text-sm font-semibold text-slate-200">Lỗi phát video</p>
             <p className="text-xs text-rose-300/80 max-w-xs">{videoError}</p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 flex-col gap-3 p-6 text-center">
             <AlertCircle className="w-10 h-10 text-slate-700" />
             <p className="text-sm font-semibold text-slate-400">Chưa có video nguồn</p>
             <p className="text-xs text-slate-600 max-w-xs">
               Dán đường link TikTok / YouTube Shorts hoặc tải file MP4 từ máy tính ở cột bên trái để bắt đầu.
             </p>
          </div>
        )}
      </div>

      {/* Multi-range Timeline UI */}
      <div className="bg-[#151921] border border-white/5 rounded-xl p-4 shrink-0">
         <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
               <span className="text-xs font-bold text-slate-400">TIMELINE</span>
               <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">MULTI-CLIP ACTIVE</span>
             </div>
             <button
                onClick={addClipRange}
                disabled={!sourceVideoUrl}
                className="text-xs font-bold text-indigo-400 flex items-center gap-1 hover:text-indigo-300 disabled:opacity-50"
             >
                 + Add New Range
             </button>
         </div>

         <div className="space-y-2 overflow-y-auto pr-2 mb-4 max-h-[20vh] min-h-[4rem]">
             {clipRanges.length === 0 ? (
                 <div className="flex items-center justify-center h-16 relative bg-slate-900/50 rounded-lg border border-white/5">
                    <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">No ranges selected</span>
                 </div>
             ) : (
                 clipRanges.map((range, idx) => (
                     <ClipRow 
                        key={range.id}
                        range={range}
                        idx={idx}
                        duration={duration}
                        updateRange={(id, s, e) => {
                           setClipRanges(clipRanges.map(r => r.id === id ? { ...r, startTime: s, endTime: e } : r));
                        }}
                        removeRange={removeClipRange}
                        onPreview={(start) => {
                            if (videoRef.current) {
                                videoRef.current.currentTime = start;
                                videoRef.current.play();
                                setIsPlaying(true);
                            }
                        }}
                     />
                 ))
             )}
         </div>

         {/* Execute Action */}
         <button
            onClick={executeCut}
            disabled={!sourceVideoUrl || clipRanges.length === 0 || isProcessingCut}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-lg text-sm font-bold shadow-lg shadow-indigo-900/20 transition-all disabled:opacity-50 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-400 flex items-center justify-center gap-2 cursor-pointer text-white"
         >
            {isProcessingCut ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  <span>{cutStatus || 'ĐANG CẮT VIDEO TRÊN SERVER...'}</span>
                </>
            ) : (
                `Cắt ${clipRanges.length > 0 ? `${clipRanges.length} Đoạn Clips` : ''} Bằng FFmpeg (Siêu Tốc)`
            )}
         </button>

         {cutError && (
           <div className="mt-2.5 p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
             {cutError}
           </div>
         )}
         {cutStatus && !isProcessingCut && !cutError && (
           <div className="mt-2.5 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs text-center font-mono">
             {cutStatus}
           </div>
         )}
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
    if (isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
