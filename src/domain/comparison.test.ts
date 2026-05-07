import { analyzePronunciationAttempt, compareExpectedToRecognized } from "./comparison";

describe("compareExpectedToRecognized", () => {
  it("marks matching words", () => {
    expect(compareExpectedToRecognized("Bonjour Camille.", "Bonjour Camille")).toEqual([
      { expected: "Bonjour", recognized: "Bonjour", status: "match" },
      { expected: "Camille", recognized: "Camille", status: "match" }
    ]);
  });

  it("marks missing and substituted words", () => {
    expect(
      compareExpectedToRecognized(
        "Je voudrais un cafe creme",
        "Je veux un cafe"
      )
    ).toEqual([
      { expected: "Je", recognized: "Je", status: "match" },
      { expected: "voudrais", recognized: "veux", status: "substituted" },
      { expected: "un", recognized: "un", status: "match" },
      { expected: "cafe", recognized: "cafe", status: "match" },
      { expected: "creme", status: "missing" }
    ]);
  });

  it("ignores empty words from spaced punctuation", () => {
    expect(compareExpectedToRecognized("Merci !", "Merci")).toEqual([
      { expected: "Merci", recognized: "Merci", status: "match" }
    ]);
  });

  it("ignores empty words from spaced question marks", () => {
    expect(compareExpectedToRecognized("Comment allez-vous ?", "Comment allez-vous")).toEqual([
      { expected: "Comment", recognized: "Comment", status: "match" },
      { expected: "allez", recognized: "allez", status: "match" },
      { expected: "vous", recognized: "vous", status: "match" }
    ]);
  });
});

describe("analyzePronunciationAttempt", () => {
  it("requests repeat when mismatch count is high", () => {
    const result = analyzePronunciationAttempt({
      expectedText: "Je voudrais un cafe creme",
      recognizedText: "Je veux un cafe",
      referenceDurationMs: 3000,
      recordingDurationMs: 3100
    });

    expect(result.needsRepeat).toBe(true);
    expect(result.timingStatus).toBe("similar");
    expect(result.mismatchCount).toBe(2);
  });

  it("marks timing as too fast", () => {
    const result = analyzePronunciationAttempt({
      expectedText: "Je voudrais un cafe creme",
      recognizedText: "Je voudrais un cafe creme",
      referenceDurationMs: 3000,
      recordingDurationMs: 1900
    });

    expect(result.timingStatus).toBe("too-fast");
    expect(result.needsRepeat).toBe(true);
  });

  it("counts extra recognized words as mismatches", () => {
    const result = analyzePronunciationAttempt({
      expectedText: "Bonjour",
      recognizedText: "Bonjour beaucoup",
      referenceDurationMs: 1000,
      recordingDurationMs: 1200
    });

    expect(result.mismatchCount).toBe(1);
    expect(result.needsRepeat).toBe(true);
  });

  it("treats invalid duration inputs as similar timing", () => {
    const result = analyzePronunciationAttempt({
      expectedText: "Bonjour",
      recognizedText: "Bonjour",
      referenceDurationMs: 0,
      recordingDurationMs: 1200
    });

    expect(result.timingStatus).toBe("similar");
    expect(result.needsRepeat).toBe(false);
  });
});
