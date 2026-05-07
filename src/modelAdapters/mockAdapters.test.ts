import { MockAnalyzerAdapter, MockAsrAdapter, MockTtsAdapter } from "./mockAdapters";

describe("MockTtsAdapter", () => {
  it("returns deterministic reference audio metadata", async () => {
    const adapter = new MockTtsAdapter();

    const result = await adapter.generate({
      sentenceId: "sentence-1",
      text: "Bonjour.",
      voice: { engine: "mock", voiceId: "camille", speed: 0.9, styleStrength: 0.6 }
    });

    expect(result.audioPath).toBe("mock://tts/sentence-1-camille-0.9-0.6.wav");
    expect(result.durationMs).toBe(800);
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it.each([0, Number.NaN])(
    "returns finite positive duration for invalid speed %s",
    async (speed) => {
      const adapter = new MockTtsAdapter();

      const result = await adapter.generate({
        sentenceId: "sentence-1",
        text: "Bonjour.",
        voice: { engine: "mock", voiceId: "camille", speed, styleStrength: 0.6 }
      });

      expect(Number.isFinite(result.durationMs)).toBe(true);
      expect(result.durationMs).toBeGreaterThan(0);
    }
  );
});

describe("MockAsrAdapter", () => {
  it("recognizes scripted mock recordings", async () => {
    const adapter = new MockAsrAdapter();

    const result = await adapter.transcribe({
      recordingPath: "mock://recording/bonjour.wav",
      fallbackText: "Bonjour."
    });

    expect(result.text).toBe("Bonjour");
    expect(result.durationMs).toBe(900);
  });

  it("uses fallback text word count for generic recordings", async () => {
    const adapter = new MockAsrAdapter();

    const result = await adapter.transcribe({
      recordingPath: "mock://recording/generic.wav",
      fallbackText: "Salut tout le monde."
    });

    expect(result.text).toBe("Salut tout le monde");
    expect(result.durationMs).toBe(1920);
  });
});

describe("MockAnalyzerAdapter", () => {
  it("delegates to domain analysis", async () => {
    const adapter = new MockAnalyzerAdapter();

    const result = await adapter.analyze({
      expectedText: "Bonjour",
      recognizedText: "Bonsoir",
      referenceDurationMs: 900,
      recordingDurationMs: 900
    });

    expect(result.needsRepeat).toBe(true);
    expect(result.mismatchCount).toBe(1);
  });
});
