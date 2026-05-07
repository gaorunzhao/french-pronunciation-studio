import type { AnalysisResult, VoiceSettings } from "../domain/types";

export interface GenerateTtsInput {
  sentenceId: string;
  text: string;
  voice: VoiceSettings;
}

export interface GeneratedAudio {
  audioPath: string;
  durationMs: number;
}

export interface TtsAdapter {
  generate(input: GenerateTtsInput): Promise<GeneratedAudio>;
}

export interface TranscribeInput {
  recordingPath: string;
  fallbackText: string;
}

export interface TranscriptionResult {
  text: string;
  durationMs: number;
}

export interface AsrAdapter {
  transcribe(input: TranscribeInput): Promise<TranscriptionResult>;
}

export interface AnalyzeInput {
  expectedText: string;
  recognizedText: string;
  referenceDurationMs: number;
  recordingDurationMs: number;
}

export interface AnalyzerAdapter {
  analyze(input: AnalyzeInput): Promise<AnalysisResult>;
}
