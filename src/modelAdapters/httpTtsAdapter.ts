import type { GenerateTtsInput, GeneratedAudio, TtsAdapter } from "./types";

interface HttpTtsAdapterOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
  playAudio?: (url: string) => Promise<void>;
}

interface TtsBackendResponse {
  audioPath: string;
  audioUrl?: string;
  durationMs: number;
}

export class HttpTtsAdapter implements TtsAdapter {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly playAudio: (url: string) => Promise<void>;

  constructor({
    baseUrl,
    fetcher = fetch,
    playAudio = playAudioElement,
  }: HttpTtsAdapterOptions) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fetcher = fetcher;
    this.playAudio = playAudio;
  }

  async generate(input: GenerateTtsInput): Promise<GeneratedAudio> {
    const response = await this.fetcher(`${this.baseUrl}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sentenceId: input.sentenceId,
        text: input.text,
        languageId: "fr",
        voice: {
          voiceId: input.voice.voiceId,
          speed: input.voice.speed,
          styleStrength: input.voice.styleStrength,
        },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `TTS backend failed with ${response.status}: ${message || "unknown error"}`,
      );
    }

    const payload = (await response.json()) as TtsBackendResponse;
    if (payload.audioUrl) {
      await this.playAudio(resolveBackendUrl(this.baseUrl, payload.audioUrl));
    }

    return {
      audioPath: payload.audioPath,
      durationMs: payload.durationMs,
    };
  }
}

function resolveBackendUrl(baseUrl: string, pathOrUrl: string) {
  return new URL(pathOrUrl, `${baseUrl}/`).toString();
}

async function playAudioElement(url: string) {
  const audio = new Audio(url);
  await audio.play();
}
