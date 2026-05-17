import "@testing-library/jest-dom/vitest";

Object.defineProperty(HTMLMediaElement.prototype, "play", {
  configurable: true,
  value: vi.fn(() => Promise.resolve()),
});

Object.defineProperty(HTMLMediaElement.prototype, "pause", {
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(HTMLMediaElement.prototype, "load", {
  configurable: true,
  value: vi.fn(),
});

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return {
          ok: true,
          json: async () => ({
            backend: "chatterbox",
            model: "ResembleAI/chatterbox",
            status: "ready",
            modelLoaded: true,
          }),
        };
      }

      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => ({}),
      };
    }),
  );
});

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});
