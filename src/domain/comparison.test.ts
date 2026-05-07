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
});
