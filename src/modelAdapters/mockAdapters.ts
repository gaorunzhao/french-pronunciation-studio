import { analyzePronunciationAttempt } from "../domain/comparison";
import type { AnalysisResult } from "../domain/types";
import type {
  AnalyzeInput,
  AnalyzerAdapter,
  AsrAdapter,
  GenerateTtsInput,
  GeneratedAudio,
  TranscribeInput,
  TranscriptionResult,
  TtsAdapter
} from "./types";

export class MockTtsAdapter implements TtsAdapter {
  async generate(input: GenerateTtsInput): Promise<GeneratedAudio> {
    const wordCount = input.text.split(/\s+/).filter(Boolean).length;
    const speed = Number.isFinite(input.voice.speed) && input.voice.speed > 0 ? input.voice.speed : 1;
    const durationMs = Math.max(800, Math.round((wordCount * 520) / speed));
    return {
      audioPath: `mock://tts/${input.sentenceId}-${input.voice.voiceId}-${input.voice.speed}-${input.voice.styleStrength}.wav`,
      durationMs
    };
  }
}

export class MockAsrAdapter implements AsrAdapter {
  async transcribe(input: TranscribeInput): Promise<TranscriptionResult> {
    const text = input.fallbackText.replace(/[.!?]$/g, "");
    return {
      text,
      durationMs: input.recordingPath.includes("bonjour")
        ? 900
        : Math.max(900, text.split(/\s+/).length * 480)
    };
  }
}

export class MockAnalyzerAdapter implements AnalyzerAdapter {
  async analyze(input: AnalyzeInput): Promise<AnalysisResult> {
    return analyzePronunciationAttempt(input);
  }
}
