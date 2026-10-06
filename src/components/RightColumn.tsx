import React, { useState, useEffect, useRef } from 'react';
import { Bot, FileText, List, Loader2, PlayCircle, Sparkles, RotateCcw, Copy, Check, Wand2, Edit3, MessageSquareText } from 'lucide-react';
import { AIAnalysisResult } from '../types';
import { cn } from '../lib/utils';

interface RightColumnProps {
  sourceVideoUrl: string | null;
  aiAnalysis: AIAnalysisResult | null;
  isProcessingAI: boolean;
  processingMessage?: string;
  onAnalyzeAI: () => void;
  onSeekTo: (seconds: number) => void;
  onUpdateTranscript?: (index: number, newText: string) => void;
}

export function RightColumn({ 
  sourceVideoUrl, 
  aiAnalysis, 
  isProcessingAI, 
  processingMessage, 
  onAnalyzeAI, 
  onSeekTo, 
  onUpdateTranscript 
}: RightColumnProps) {
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary'>('transcript');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  // Creative Script Generator state
  const [creativeScript, setCreativeScript] = useState<string | null>(null);
  const [summaryMode, setSummaryMode] = useState<'original' | 'creative'>('original');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isEditingCreative, setIsEditingCreative] = useState(false);
  const [editCreativeValue, setEditCreativeValue] = useState('');

  // Reset creative script when a completely new video analysis is done
  useEffect(() => {
    // Keep state or reset if no analysis
    if (!aiAnalysis) {
      setCreativeScript(null);
      setSummaryMode('original');
    }
  }, [aiAnalysis]);

  const originalFullTranscript = Array.isArray(aiAnalysis?.transcript)
    ? aiAnalysis.transcript.map(line => line.text).join('\n\n')
    : '';

  const handleGenerateCreativeScript = async () => {
    if (!originalFullTranscript) {
      alert("Chưa có nội dung thoại gốc để tạo thoại mới. Vui lòng bấm 'AI Analyze Video' trước!");
      return;
    }

    setIsGeneratingScript(true);
    setGeneratingMessage("Gemini AI đang sáng tạo kịch bản mới hấp dẫn...");
    setActiveTab('summary');

    try {
      const res = await fetch('/api/generate-creative-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalTranscript: originalFullTranscript,
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Lỗi máy chủ (${res.status})`);
      }

      const data = await res.json();
      if (data.script) {
        setCreativeScript(data.script);
        setSummaryMode('creative');
      } else {
        throw new Error("Không nhận được nội dung kịch bản từ AI.");
      }
    } catch (err: any) {
      console.error("Lỗi khi tạo thoại mới:", err);
      alert("Lỗi khi tạo kịch bản mới: " + (err.message || "Vui lòng thử lại"));
    } finally {
      setIsGeneratingScript(false);
      setGeneratingMessage('');
    }
  };

  const handleCopyText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0F1219] w-full overflow-hidden">
      {/* Tabs at the very top */}
      <div className="flex border-b border-white/5 shrink-0">
        <button
          className={cn(
            "flex-1 py-4 text-xs font-bold tracking-widest uppercase transition-colors relative flex items-center justify-center gap-2",
            activeTab === 'transcript'
              ? "text-white border-b-2 border-indigo-500 bg-white/5"
              : "text-slate-500 hover:text-slate-300 border-b-2 border-transparent"
          )}
          onClick={() => setActiveTab('transcript')}
        >
          <List className="w-3.5 h-3.5" />
          Transcript
        </button>
        <button
          className={cn(
            "flex-1 py-4 text-xs font-bold tracking-widest uppercase transition-colors relative flex items-center justify-center gap-2",
            activeTab === 'summary'
              ? "text-white border-b-2 border-indigo-500 bg-white/5"
              : "text-slate-500 hover:text-slate-300 border-b-2 border-transparent"
          )}
          onClick={() => setActiveTab('summary')}
        >
          <FileText className="w-3.5 h-3.5" />
          Summary / Kịch bản
          {creativeScript && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          )}
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
        {/* Main Analysis Button */}
        <button
          onClick={onAnalyzeAI}
          disabled={!sourceVideoUrl || isProcessingAI || isGeneratingScript}
          className="w-full py-2.5 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center justify-center gap-2 shadow-sm"
        >
          {isProcessingAI ? (
            <>
              <Loader2 className="animate-spin h-4 w-4" />
              {processingMessage || 'ANALYZING...'}
            </>
          ) : (
            <>
              <Bot className="w-4 h-4" />
              AI Analyze Video
            </>
          )}
        </button>

        {aiAnalysis ? (
          <div className="flex-1 flex flex-col overflow-y-auto">
            {activeTab === 'transcript' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
                  <span className="font-medium flex items-center gap-1.5 text-slate-300">
                    <MessageSquareText className="w-3.5 h-3.5 text-indigo-400" />
                    Thoại gốc video (Chia 10s & có thể sửa)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {Array.isArray(aiAnalysis?.transcript) ? `${aiAnalysis.transcript.length} đoạn` : ''}
                  </span>
                </div>

                {Array.isArray(aiAnalysis?.transcript) ? aiAnalysis.transcript.map((line, idx) => (
                  <div 
                    key={idx}
                    className="group flex flex-col gap-1 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors border border-white/5"
                  >
                    <div className="flex gap-3">
                      <span 
                        onClick={() => {
                          let sec = line.seconds;
                          if (sec === undefined && line.time) {
                            const parts = line.time.split(':');
                            if (parts.length === 2) {
                               sec = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                            } else {
                               sec = 0;
                            }
                          }
                          onSeekTo(sec || 0);
                        }}
                        className="text-[11px] font-mono font-bold text-indigo-400 pt-0.5 shrink-0 cursor-pointer hover:text-indigo-300 hover:underline"
                        title="Bấm để tua video đến đoạn này"
                      >
                        {line.time || '0:00'}
                      </span>
                      
                      {editingIndex === idx ? (
                        <div className="flex-1 flex flex-col gap-2">
                          <textarea 
                            autoFocus
                            value={editValue}
                            onChange={(e) => {
                                setEditValue(e.target.value);
                                e.target.style.height = 'inherit';
                                e.target.style.height = `${Math.max(60, e.target.scrollHeight)}px`;
                            }}
                            className="w-full bg-[#1A1D24] text-xs text-white p-2.5 rounded border border-indigo-500/50 outline-none focus:border-indigo-400 overflow-hidden leading-relaxed shadow-inner"
                            style={{ minHeight: '60px' }}
                            onFocus={(e) => {
                                e.target.style.height = 'inherit';
                                e.target.style.height = `${Math.max(60, e.target.scrollHeight)}px`;
                            }}
                          />
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setEditingIndex(null)}
                              className="px-3 py-1 text-[11px] rounded hover:bg-white/10 text-slate-300 transition-colors"
                            >
                              Hủy
                            </button>
                            <button 
                              onClick={() => {
                                onUpdateTranscript?.(idx, editValue);
                                setEditingIndex(null);
                              }}
                              className="px-3 py-1 text-[11px] font-semibold rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                            >
                              Lưu thay đổi
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p 
                          onClick={() => {
                            setEditingIndex(idx);
                            setEditValue(line.text || '');
                          }}
                          className="text-xs leading-relaxed text-slate-300 group-hover:text-white transition-colors cursor-text whitespace-pre-wrap flex-1"
                          title="Bấm vào để chỉnh sửa đoạn thoại này"
                        >
                          {line.text || ''}
                        </p>
                      )}
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-slate-500 italic text-center py-4">Chưa có transcript nào.</p>
                )}
              </div>
            ) : (
              /* Summary & Creative Script View */
              <div className="flex flex-col gap-3">
                {/* Control Panel: Generate Creative Script & Switch Buttons */}
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerateCreativeScript}
                      disabled={isGeneratingScript || isProcessingAI || !originalFullTranscript}
                      className="flex-1 py-2 px-3 rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingScript ? (
                        <>
                          <Loader2 className="animate-spin w-3.5 h-3.5" />
                          <span>Đang viết thoại mới...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Tạo thoại mới (Gemini AI)</span>
                        </>
                      )}
                    </button>

                    {creativeScript && summaryMode === 'creative' && (
                      <button
                        onClick={() => setSummaryMode('original')}
                        className="py-2 px-3 rounded-md bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/10"
                        title="Quay lại xem toàn bộ thoại gốc của video"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Thoại gốc</span>
                      </button>
                    )}

                    {creativeScript && summaryMode === 'original' && (
                      <button
                        onClick={() => setSummaryMode('creative')}
                        className="py-2 px-3 rounded-md bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Chuyển sang xem kịch bản sáng tạo mới"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Xem thoại mới</span>
                      </button>
                    )}
                  </div>

                  {/* Mode & Action Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                    <div className="flex items-center gap-1.5 font-medium">
                      {summaryMode === 'creative' && creativeScript ? (
                        <span className="text-amber-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          Đang xem: Thoại mới sáng tạo
                        </span>
                      ) : (
                        <span className="text-slate-300 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-indigo-400" />
                          Đang xem: Thoại gốc video
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleCopyText(summaryMode === 'creative' && creativeScript ? creativeScript : originalFullTranscript)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5 transition-colors font-mono"
                      title="Sao chép toàn bộ văn bản này"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Loading Banner if Generating */}
                {isGeneratingScript && (
                  <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2.5 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                    <span>{generatingMessage || "Gemini đang sáng tạo kịch bản thoại viral..."}</span>
                  </div>
                )}

                {/* Script Display Card */}
                <div className="p-3.5 rounded-lg bg-[#141822] border border-white/5 flex flex-col gap-3 min-h-[220px]">
                  {summaryMode === 'creative' && creativeScript ? (
                    <div className="flex flex-col gap-2">
                      {isEditingCreative ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            autoFocus
                            value={editCreativeValue}
                            onChange={(e) => {
                              setEditCreativeValue(e.target.value);
                              e.target.style.height = 'inherit';
                              e.target.style.height = `${Math.max(140, e.target.scrollHeight)}px`;
                            }}
                            className="w-full bg-[#1A1D24] text-xs text-white p-3 rounded-lg border border-indigo-500/60 outline-none leading-relaxed overflow-hidden"
                            style={{ minHeight: '140px' }}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setIsEditingCreative(false)}
                              className="px-3 py-1 text-xs rounded hover:bg-white/10 text-slate-300"
                            >
                              Hủy
                            </button>
                            <button
                              onClick={() => {
                                setCreativeScript(editCreativeValue);
                                setIsEditingCreative(false);
                              }}
                              className="px-3 py-1 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                            >
                              Lưu kịch bản
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="prose prose-invert max-w-none text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text cursor-text"
                          onClick={() => {
                            setEditCreativeValue(creativeScript);
                            setIsEditingCreative(true);
                          }}
                          title="Bấm vào để chỉnh sửa thoại mới này"
                        >
                          {creativeScript}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Original Video Script (Full concatenated) */
                    <div className="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                      {originalFullTranscript || 'Chưa có nội dung transcript.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
             <Bot className="w-12 h-12 text-slate-600 mb-4" />
             <p className="text-xs font-medium text-slate-400">
               Chưa có phân tích. Nhấn 'AI Analyze Video' để bắt đầu.
             </p>
          </div>
        )}
      </div>

      {aiAnalysis && (
        <div className="p-3.5 border-t border-white/5 bg-[#14181F] shrink-0 flex items-center justify-between text-[11px]">
           <div className="flex items-center gap-2">
             <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Gemini Model:</span>
             <span className="text-indigo-400 font-mono text-[10px] bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
               {creativeScript && summaryMode === 'creative' ? 'Gemini 3 Flash (Creative Script)' : 'Gemini 3 Audio Engine'}
             </span>
           </div>
           <button
             onClick={() => handleCopyText(summaryMode === 'creative' && creativeScript ? creativeScript : originalFullTranscript)}
             className="text-slate-400 hover:text-white transition-colors"
             title="Copy nhanh"
           >
             <Copy className="w-3.5 h-3.5" />
           </button>
        </div>
      )}
    </div>
  );
}

