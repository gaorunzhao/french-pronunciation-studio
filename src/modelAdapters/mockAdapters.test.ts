import { MockAsrAdapter, MockTtsAdapter } from "./mockAdapters";

describe("MockTtsAdapter", () => {
  it("returns deterministic reference audio metadata", async () => {
    const adapter = new MockTtsAdapter();

    const result = await adapter.generate({
      sentenceId: "sentence-1",
      text: "Bonjour.",
      voice: { engine: "mock", voiceId: "camille", speed: 0.9, styleStrength: 0.6 }
    });

    expect(result.audioPath).toBe("mock://tts/sentence-1-camille-0.9-0.6.wav");
    expect(result.durationMs).toBeGreaterThan(0);
  });
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
});
