import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LeftColumn } from './components/LeftColumn';
import { MiddleColumn } from './components/MiddleColumn';
import { RightColumn } from './components/RightColumn';
import { PanelSplitter } from './components/PanelSplitter';
import { ClipRange, VideoClip, AIAnalysisResult } from './types';
import { Video, Sparkles, SlidersHorizontal, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [sourceVideoUrl, setSourceVideoUrl] = useState<string | null>(null);
  const [directVideoUrl, setDirectVideoUrl] = useState<string | null>(null);
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [clipRanges, setClipRanges] = useState<ClipRange[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiProcessingMessage, setAiProcessingMessage] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Layout & Resizing State
  const mainContainerRef = useRef<HTMLElement>(null);
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    const saved = localStorage.getItem('flux_panel_left_width');
    return saved ? Math.max(220, Math.min(550, parseInt(saved, 10))) : 300;
  });
  const [rightWidth, setRightWidth] = useState<number>(() => {
    const saved = localStorage.getItem('flux_panel_right_width');
    return saved ? Math.max(260, Math.min(650, parseInt(saved, 10))) : 340;
  });
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [activeDragging, setActiveDragging] = useState<'left' | 'right' | null>(null);

  // Handle Dragging
  useEffect(() => {
    if (!activeDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!mainContainerRef.current) return;
      const rect = mainContainerRef.current.getBoundingClientRect();
      const containerWidth = rect.width;

      if (activeDragging === 'left') {
        const clientX = e.clientX;
        const newWidth = Math.max(200, Math.min(550, clientX - rect.left));
        // Check if middle has enough room
        const currentRight = isRightCollapsed ? 42 : rightWidth;
        if (containerWidth - newWidth - currentRight >= 320) {
          setLeftWidth(newWidth);
          setIsLeftCollapsed(false);
        }
      } else if (activeDragging === 'right') {
        const clientX = e.clientX;
        const newWidth = Math.max(240, Math.min(650, rect.right - clientX));
        const currentLeft = isLeftCollapsed ? 42 : leftWidth;
        if (containerWidth - currentLeft - newWidth >= 320) {
          setRightWidth(newWidth);
          setIsRightCollapsed(false);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!mainContainerRef.current || !e.touches[0]) return;
      const rect = mainContainerRef.current.getBoundingClientRect();
      const containerWidth = rect.width;
      const touchX = e.touches[0].clientX;

      if (activeDragging === 'left') {
        const newWidth = Math.max(200, Math.min(550, touchX - rect.left));
        const currentRight = isRightCollapsed ? 42 : rightWidth;
        if (containerWidth - newWidth - currentRight >= 320) {
          setLeftWidth(newWidth);
          setIsLeftCollapsed(false);
        }
      } else if (activeDragging === 'right') {
        const newWidth = Math.max(240, Math.min(650, rect.right - touchX));
        const currentLeft = isLeftCollapsed ? 42 : leftWidth;
        if (containerWidth - currentLeft - newWidth >= 320) {
          setRightWidth(newWidth);
          setIsRightCollapsed(false);
        }
      }
    };

    const handleEnd = () => {
      setActiveDragging(null);
      localStorage.setItem('flux_panel_left_width', leftWidth.toString());
      localStorage.setItem('flux_panel_right_width', rightWidth.toString());
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [activeDragging, leftWidth, rightWidth, isLeftCollapsed, isRightCollapsed]);

  const handleResetLayout = () => {
    setLeftWidth(300);
    setRightWidth(340);
    setIsLeftCollapsed(false);
    setIsRightCollapsed(false);
    localStorage.setItem('flux_panel_left_width', '300');
    localStorage.setItem('flux_panel_right_width', '340');
  };

  // System State
  const [workerStatus, setWorkerStatus] = useState<string>('Sáºµn sÃ ng táº£i video');
  const [isWorkerReady, setIsWorkerReady] = useState<boolean>(true);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const lastRequestedUrlRef = useRef<string>('');

  const handleDownloadSource = async (url: string) => {
    lastRequestedUrlRef.current = url;
    setIsExtracting(true);
    setWorkerStatus('Äang gá»­i yÃªu cáº§u táº£i video Ä‘áº¿n Server (Bypass CORS)...');
    
    try {
        // First get the direct URL so we can store it for cutting later
        const urlRes = await fetch('/api/get-tiktok-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        if (urlRes.ok) {
            const urlData = await urlRes.json();
            if (urlData.directUrl) {
                setDirectVideoUrl(urlData.directUrl);
            }
        }

        const res = await fetch('/api/download-tiktok', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server lá»—i ${res.status}`);
        }
        
        setWorkerStatus('Äang náº¡p luá»“ng video vÃ o bá»™ nhá»›...');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        setSourceVideoUrl(blobUrl);
        setWorkerStatus('Táº£i video thÃ nh cÃ´ng! Server FFmpeg Ä‘Ã£ sáºµn sÃ ng cáº¯t.');
    } catch (err: any) {
        console.error("Lá»—i táº£i video:", err);
        setWorkerStatus(`Lá»—i: ${err.message}`);
        alert(`KhÃ´ng thá»ƒ táº£i video: ${err.message}`);
    } finally {
        setIsExtracting(false);
    }
  };

  const handleAnalyzeAI = async () => {
    if (!sourceVideoUrl) return;
    setIsProcessingAI(true);
    setAiProcessingMessage('TrÃ­ch xuáº¥t Audio (Web API)...');
    try {
      const responseAudio = await fetch(sourceVideoUrl);
      const arrayBuffer = await responseAudio.arrayBuffer();

      const audioContext = new window.AudioContext({ sampleRate: 16000 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);

      const createWavFile = (channelData: Float32Array, sampleRate: number): ArrayBuffer => {
          const buffer = new ArrayBuffer(44 + channelData.length * 2);
          const view = new DataView(buffer);
          
          const writeString = (view: DataView, offset: number, string: string) => {
              for (let i = 0; i < string.length; i++) {
                  view.setUint8(offset + i, string.charCodeAt(i));
              }
          };
          
          writeString(view, 0, 'RIFF');
          view.setUint32(4, 36 + channelData.length * 2, true);
          writeString(view, 8, 'WAVE');
          writeString(view, 12, 'fmt ');
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, 1, true);
          view.setUint32(24, sampleRate, true);
          view.setUint32(28, sampleRate * 2, true);
          view.setUint16(32, 2, true);
          view.setUint16(34, 16, true);
          writeString(view, 36, 'data');
          view.setUint32(40, channelData.length * 2, true);
          
          let offset = 44;
          for (let i = 0; i < channelData.length; i++, offset += 2) {
              let s = Math.max(-1, Math.min(1, channelData[i]));
              view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          }
          return buffer;
      };

      const wavBuffer = createWavFile(channelData, audioContext.sampleRate);
      
      const bufferToBase64 = (buffer: ArrayBuffer): string => {
          let binary = '';
          const bytes = new Uint8Array(buffer);
          const len = bytes.byteLength;
          // Process in chunks to avoid call stack size exceeded
          const chunkSize = 8192;
          for (let i = 0; i < len; i += chunkSize) {
             const chunk = bytes.subarray(i, i + chunkSize);
             binary += String.fromCharCode.apply(null, Array.from(chunk));
          }
          return btoa(binary);
      };

      const base64Data = bufferToBase64(wavBuffer);
      setAiProcessingMessage('Äang phÃ¢n tÃ­ch (Há»‡ thá»‘ng AI Router Äang Auto Fallback)...');
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           mimeType: 'audio/wav',
           data: base64Data,
           prompt: "PhÃ¢n tÃ­ch Ã¢m thanh, tráº£ vá» ÄÃšNG Äá»ŠNH Dáº NG JSON, KHÃ”NG CÃ“ MARKDOWN (khÃ´ng dÃ¹ng ```json). Báº¯t buá»™c chá»©a 2 trÆ°á»ng:\\n- 'transcript': máº£ng cÃ¡c Ä‘á»‘i tÆ°á»£ng gá»“m 'time' (Ä‘á»‹nh dáº¡ng 'MM:SS'), 'seconds' (sá»‘ giÃ¢y, VD: 0, 10, 20), vÃ  'text' (ná»™i dung).\\nYÃŠU Cáº¦U: Viáº¿t láº¡i TOÃ€N Bá»˜ thoáº¡i cá»§a video chuáº©n xÃ¡c nháº¥t Ä‘áº§y Ä‘á»§ 100%. PhÃ¢n chia thoáº¡i thÃ nh Tá»ªNG ÄOáº N DÃ€I KHOáº¢NG 10 GIÃ‚Y (00:00, 00:10, 00:20...). á»ž má»—i Ä‘oáº¡n thÃªm dáº¥u cÃ¢u ngáº¯t nghá»‰ tá»± nhiÃªn nháº¥t, Ä‘Ãºng ngá»¯ phÃ¡p. KHÃ”NG ÄÆ¯á»¢C TÃ“M Táº®T.\\n- 'summary': tÃ³m táº¯t chung." 
        })
      });
      
      if (!response.ok) {
         throw new Error("Failed to analyze");
      }
      
      const resultData = await response.json();
      setAiAnalysis(resultData);
    } catch (error) {
      console.error("AI Analysis error:", error);
      alert("CÃ³ lá»—i khi phÃ¢n tÃ­ch Audio hoáº·c gá»i Gemini API.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleUpdateTranscript = (index: number, newText: string) => {
    if (!aiAnalysis || !Array.isArray(aiAnalysis.transcript)) return;
    const newTranscript = [...aiAnalysis.transcript];
    newTranscript[index] = { ...newTranscript[index], text: newText };
    setAiAnalysis({ ...aiAnalysis, transcript: newTranscript });
  };

  const handleSeekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  const handleCutComplete = (newClips: VideoClip[]) => {
      setClips([...clips, ...newClips]);
      // Optional: clear ranges after cut
      // setClipRanges([]); 
  };

  const handleDeleteClip = (id: string) => {
      setClips(clips.filter(clip => clip.id !== id));
  };

  return (
    <div className={cn(
      "flex flex-col h-screen bg-[#0B0E14] text-slate-200 overflow-hidden font-sans",
      activeDragging && "select-none cursor-col-resize"
    )}>
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#0B0E14] z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">FLUX STUDIO AI</h1>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          {/* Reset Layout Button */}
          <button
            onClick={handleResetLayout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors text-xs cursor-pointer shadow-sm"
            title="Äáº·t láº¡i kÃ­ch thÆ°á»›c cÃ¡c cá»™t vá» máº·c Ä‘á»‹nh (25% / 45% / 30%)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Reset Cá»™t</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></span>
            <span className="text-slate-400">SERVER FFMPEG:</span> ACTIVE
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
            <span className="text-slate-400">GEMINI API:</span> CONNECTED
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-indigo-400">
            FS
          </div>
        </div>
      </header>

      {/* Main Resizable Tool Canvas with Horizontal Scroll Support */}
      <main 
        ref={mainContainerRef} 
        className="flex-1 flex overflow-x-auto overflow-y-hidden horizontal-scroll-container relative min-w-full bg-[#090B10]"
      >
        {/* Left Column (Source & Clips) */}
        {isLeftCollapsed ? (
          <div 
            onClick={() => setIsLeftCollapsed(false)}
            className="w-11 shrink-0 bg-[#0F1219] border-r border-white/10 flex flex-col items-center py-4 cursor-pointer hover:bg-white/5 transition-colors group select-none"
            title="Nháº¥p Ä‘á»ƒ má»Ÿ rá»™ng cá»™t Nguá»“n Video & Clips"
          >
            <button className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-4">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="writing-vertical text-[11px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-indigo-300 rotate-180 flex items-center gap-2">
              <span>Nguá»“n & Clips</span>
              {clips.length > 0 && (
                <span className="bg-indigo-500 text-white rounded-full px-1.5 py-0.2 text-[9px] font-mono">
                  {clips.length}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div 
            style={{ width: `${leftWidth}px` }} 
            className="shrink-0 bg-[#0F1219] flex flex-col overflow-hidden transition-[width] duration-75"
          >
            <LeftColumn 
               sourceVideoUrl={sourceVideoUrl}
               onDownloadSource={handleDownloadSource}
               clips={clips}
               onDeleteClip={handleDeleteClip}
               workerStatus={workerStatus}
               isWorkerReady={isWorkerReady}
               isExtracting={isExtracting}
            />
          </div>
        )}

        {/* Splitter between Left & Middle */}
        <PanelSplitter 
          onMouseDown={(e) => {
            e.preventDefault();
            setActiveDragging('left');
          }}
          onTouchStart={() => setActiveDragging('left')}
          onDoubleClick={handleResetLayout}
          isDragging={activeDragging === 'left'}
          isCollapsed={isLeftCollapsed}
          onToggleCollapse={() => setIsLeftCollapsed(!isLeftCollapsed)}
          collapseDirection="left"
          panelName="Cá»™t Nguá»“n Video"
          currentWidth={isLeftCollapsed ? 42 : leftWidth}
        />

        {/* Middle Column (Video Player & Cut Controls) */}
        <div className="flex-1 min-w-[360px] bg-[#0B0E14] flex flex-col overflow-hidden shrink-0">
          <MiddleColumn 
             sourceVideoUrl={sourceVideoUrl}
             directVideoUrl={directVideoUrl}
             videoRef={videoRef}
             clipRanges={clipRanges}
             setClipRanges={setClipRanges}
             onCutComplete={handleCutComplete}
             isExtracting={isExtracting}
          />
        </div>

        {/* Splitter between Middle & Right */}
        <PanelSplitter 
          onMouseDown={(e) => {
            e.preventDefault();
            setActiveDragging('right');
          }}
          onTouchStart={() => setActiveDragging('right')}
          onDoubleClick={handleResetLayout}
          isDragging={activeDragging === 'right'}
          isCollapsed={isRightCollapsed}
          onToggleCollapse={() => setIsRightCollapsed(!isRightCollapsed)}
          collapseDirection="right"
          panelName="Cá»™t Transcript / AI"
          currentWidth={isRightCollapsed ? 42 : rightWidth}
        />

        {/* Right Column (Transcript & AI Creative Script) */}
        {isRightCollapsed ? (
          <div 
            onClick={() => setIsRightCollapsed(false)}
            className="w-11 shrink-0 bg-[#0F1219] border-l border-white/10 flex flex-col items-center py-4 cursor-pointer hover:bg-white/5 transition-colors group select-none"
            title="Nháº¥p Ä‘á»ƒ má»Ÿ rá»™ng cá»™t Transcript & AI Summary"
          >
            <button className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-4">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="writing-vertical text-[11px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-indigo-300 rotate-180 flex items-center gap-2">
              <span>Transcript & AI</span>
              {aiAnalysis && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </div>
          </div>
        ) : (
          <div 
            style={{ width: `${rightWidth}px` }} 
            className="shrink-0 bg-[#0F1219] flex flex-col overflow-hidden transition-[width] duration-75"
          >
            <RightColumn 
               sourceVideoUrl={sourceVideoUrl}
               aiAnalysis={aiAnalysis}
               isProcessingAI={isProcessingAI}
               processingMessage={aiProcessingMessage}
               onAnalyzeAI={handleAnalyzeAI}
               onSeekTo={handleSeekTo}
               onUpdateTranscript={handleUpdateTranscript}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-8 shrink-0 bg-[#07090C] border-t border-white/5 flex items-center justify-between px-4 text-[10px] text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span>ENV: PRODUCTION_READY</span>
          <span className="text-slate-700">|</span>
          <span className="text-indigo-400/80">KÃ©o cÃ¡c thanh giá»¯a cÃ¡c cá»™t Ä‘á»ƒ tÃ¹y chá»‰nh chiá»u rá»™ng</span>
        </div>
        <div className="flex items-center gap-3">
          <span>KÃCH THÆ¯á»šC: [{isLeftCollapsed ? 'Thu gá»n' : `${leftWidth}px`} | Tá»± Ä‘á»™ng | {isRightCollapsed ? 'Thu gá»n' : `${rightWidth}px`}]</span>
          <span className="text-slate-700">|</span>
          <div>&copy; 2024 FLUX STUDIO v1.0.5</div>
        </div>
      </footer>
    </div>
  );
}


