export interface ClipRange {
  id: string;
  startTime: number;
  endTime: number;
}

export interface VideoClip {
  id: string;
  url: string;
  originalStart: number;
  originalEnd: number;
}

export interface TranscriptLine {
  time: string; // e.g. "0:15"
  text: string;
  seconds?: number; // parsed time for seeking
}

export interface AIAnalysisResult {
  transcript: TranscriptLine[];
  summary: string;
}
