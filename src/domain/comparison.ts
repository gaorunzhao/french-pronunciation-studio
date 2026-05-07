import type { AnalysisResult, WordComparison } from "./types";

interface AnalyzeInput {
  expectedText: string;
  recognizedText: string;
  referenceDurationMs: number;
  recordingDurationMs: number;
}

export function compareExpectedToRecognized(
  expectedText: string,
  recognizedText: string
): WordComparison[] {
  const expectedWords = tokenize(expectedText);
  const recognizedWords = tokenize(recognizedText);

  return expectedWords.map((expected, index) => {
    const recognized = recognizedWords[index];
    if (!recognized) return { expected, status: "missing" };
    if (normalizeWord(expected) === normalizeWord(recognized)) {
      return { expected, recognized, status: "match" };
    }
    return { expected, recognized, status: "substituted" };
  });
}

export function analyzePronunciationAttempt(input: AnalyzeInput): AnalysisResult {
  const words = compareExpectedToRecognized(input.expectedText, input.recognizedText);
  const mismatchCount = words.filter((word) => word.status !== "match").length;
  const ratio = input.recordingDurationMs / input.referenceDurationMs;
  const timingStatus = ratio < 0.75 ? "too-fast" : ratio > 1.35 ? "too-slow" : "similar";

  return {
    words,
    mismatchCount,
    timingStatus,
    needsRepeat: mismatchCount > 0 || timingStatus !== "similar"
  };
}

function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => word.replace(/^[,;:!?."']+|[,;:!?."']+$/g, ""));
}

function normalizeWord(word: string): string {
  return word
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
