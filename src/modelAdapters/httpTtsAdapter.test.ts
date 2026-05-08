import { HttpTtsAdapter } from "./httpTtsAdapter";

describe("HttpTtsAdapter", () => {
  it("posts French TTS requests to the local backend and plays the returned audio", async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        audioPath: "/tmp/reference.wav",
        audioUrl: "/audio/reference.wav",
        durationMs: 1840,
      }),
    })) as unknown as typeof fetch;
    const playAudio = vi.fn(async () => undefined);
    const adapter = new HttpTtsAdapter({
      baseUrl: "http://127.0.0.1:8765",
      fetcher,
      playAudio,
    });

    const result = await adapter.generate({
      sentenceId: "sentence-1",
      text: "Bonjour.",
      voice: {
        engine: "chatterbox",
        voiceId: "camille",
        speed: 0.9,
        styleStrength: 0.7,
      },
    });

    expect(fetcher).toHaveBeenCalledWith(
      "http://127.0.0.1:8765/tts",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentenceId: "sentence-1",
          text: "Bonjour.",
          languageId: "fr",
          voice: {
            voiceId: "camille",
            speed: 0.9,
            styleStrength: 0.7,
          },
        }),
      }),
    );
    expect(playAudio).toHaveBeenCalledWith(
      "http://127.0.0.1:8765/audio/reference.wav",
    );
    expect(result).toEqual({
      audioPath: "/tmp/reference.wav",
      durationMs: 1840,
    });
  });

  it("throws a clear error when the backend rejects a request", async () => {
    const fetcher = vi.fn(async () => ({
      ok: false,
      status: 503,
      text: async () => "model unavailable",
    })) as unknown as typeof fetch;
    const adapter = new HttpTtsAdapter({
      baseUrl: "http://127.0.0.1:8765/",
      fetcher,
      playAudio: async () => undefined,
    });

    await expect(
      adapter.generate({
        sentenceId: "sentence-1",
        text: "Bonjour.",
        voice: {
          engine: "chatterbox",
          voiceId: "camille",
          speed: 0.9,
          styleStrength: 0.7,
        },
      }),
    ).rejects.toThrow("TTS backend failed with 503: model unavailable");
  });
});
