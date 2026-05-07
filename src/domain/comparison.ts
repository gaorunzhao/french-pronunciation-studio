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
  const expectedWordCount = tokenize(input.expectedText).length;
  const recognizedWordCount = tokenize(input.recognizedText).length;
  const extraRecognizedWordCount = Math.max(0, recognizedWordCount - expectedWordCount);
  const mismatchCount =
    words.filter((word) => word.status !== "match").length + extraRecognizedWordCount;
  const timingStatus = getTimingStatus(input.referenceDurationMs, input.recordingDurationMs);

  return {
    words,
    mismatchCount,
    timingStatus,
    needsRepeat: mismatchCount > 0 || timingStatus !== "similar"
  };
}

function tokenize(text: string): string[] {
  return text
    .split(/[\s-]+/)
    .map((word) => word.trim())
    .map((word) => word.replace(/^[,;:!?."']+|[,;:!?."']+$/g, ""))
    .filter(Boolean);
}

function normalizeWord(word: string): string {
  return word
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function getTimingStatus(
  referenceDurationMs: number,
  recordingDurationMs: number
): AnalysisResult["timingStatus"] {
  if (
    !Number.isFinite(referenceDurationMs) ||
    !Number.isFinite(recordingDurationMs) ||
    referenceDurationMs <= 0 ||
    recordingDurationMs <= 0
  ) {
    return "similar";
  }

  const ratio = recordingDurationMs / referenceDurationMs;
  return ratio < 0.75 ? "too-fast" : ratio > 1.35 ? "too-slow" : "similar";
}
