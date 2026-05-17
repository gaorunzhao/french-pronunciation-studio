export type SentenceState = "new" | "practiced" | "needs-repeat" | "stable";

export type ViewMode = "reader" | "lab";

export interface TextDocument {
  id: string;
  title: string;
  source?: string;
  notes?: string;
  createdAt: string;
  sentenceIds: string[];
}

export interface PracticeSentence {
  id: string;
  textId: string;
  index: number;
  text: string;
  state: SentenceState;
}

export interface VoiceSettings {
  engine: "mock" | "chatterbox";
  voiceId: string;
  speed: number;
  styleStrength: number;
}

export interface TtsCacheEntry {
  id: string;
  sentenceId: string;
  cacheKey: string;
  audioPath: string;
  durationMs: number;
  createdAt: string;
}

export interface Attempt {
  id: string;
  sessionId: string;
  sentenceId: string;
  recordingPath: string;
  durationMs: number;
  recognizedText: string;
  createdAt: string;
  analysis: AnalysisResult;
}

export interface PracticeSession {
  id: string;
  textId: string;
  startedAt: string;
  endedAt?: string;
  attemptIds: string[];
}

export interface WordComparison {
  expected: string;
  recognized?: string;
  status: "match" | "missing" | "substituted" | "unclear";
}

export interface AnalysisResult {
  words: WordComparison[];
  mismatchCount: number;
  timingStatus: "similar" | "too-fast" | "too-slow";
  needsRepeat: boolean;
}
