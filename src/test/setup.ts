import "@testing-library/jest-dom/vitest";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

if (typeof window !== "undefined" && !window.localStorage) {
  const localStorage = createMemoryStorage();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorage,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: localStorage,
  });
}

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

Object.defineProperty(Element.prototype, "scrollIntoView", {
  configurable: true,
  value: vi.fn(),
});

if (typeof window.PointerEvent === "undefined") {
  Object.defineProperty(window, "PointerEvent", {
    configurable: true,
    value: MouseEvent,
  });
  Object.defineProperty(globalThis, "PointerEvent", {
    configurable: true,
    value: MouseEvent,
  });
}

Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
  configurable: true,
  value: vi.fn(() => false),
});

Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
  configurable: true,
  value: vi.fn(),
});

class TestResizeObserver implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

if (typeof globalThis.ResizeObserver === "undefined") {
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: TestResizeObserver,
  });
  Object.defineProperty(window, "ResizeObserver", {
    configurable: true,
    value: TestResizeObserver,
  });
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return {
          ok: true,
          json: async () => ({
            backend: "swift-native",
            model: "sherpa-onnx-kokoro-int8",
            status: "ready",
            modelLoaded: true,
            voices: [{ id: "default", label: "Siwis French" }],
            defaultModelId: "kokoro",
            models: [
              {
                id: "system",
                name: "macOS Speech",
                shortName: "macOS",
                size: "built-in",
                status: "ready",
                progress: 100,
                voices: [{ id: "default", label: "System default" }],
                emotions: [{ id: "default", label: "Default" }],
              },
              {
                id: "kokoro",
                name: "Kokoro via Sherpa-ONNX",
                shortName: "Kokoro",
                size: "~158 MB",
                status: "ready",
                progress: 100,
                voices: [{ id: "default", label: "Siwis French" }],
                emotions: [{ id: "default", label: "Default" }],
              },
            ],
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
