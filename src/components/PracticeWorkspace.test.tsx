import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import type { GeneratedAudio, TtsAdapter } from "../modelAdapters/types";
import { TextImport } from "./TextImport";

describe("Practice workspace", () => {
  it("imports a passage and shows line cards in practice", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "New passage" }));
    await user.type(screen.getByLabelText("Title"), "Cafe dialogue");
    await user.type(
      screen.getByLabelText("Content"),
      "Bonjour. Je voudrais un cafe creme, s'il vous plait.",
    );
    await user.click(screen.getByRole("button", { name: "Start practice" }));

    expect(
      screen.getByRole("button", { name: "Cafe dialogue, 2 sentences" }),
    ).toBeInTheDocument();
    const firstSentence = screen.getByRole("button", { name: "Bonjour." });
    const secondSentence = screen.getByRole("button", {
      name: "Je voudrais un cafe creme, s'il vous plait.",
    });

    expect(firstSentence).toHaveAttribute("aria-pressed", "true");
    expect(secondSentence).toHaveAttribute("aria-pressed", "false");

    await user.click(secondSentence);

    expect(firstSentence).toHaveAttribute("aria-pressed", "false");
    expect(secondSentence).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the waveform area visible even before generated audio", async () => {
    const user = userEvent.setup();
    const ttsAdapter: TtsAdapter = {
      generate: vi.fn(async () => ({
        audioPath: "mock://tts/reference.wav",
        durationMs: 1800,
      })),
    };
    render(<App ttsAdapter={ttsAdapter} />);

    await screen.findByRole("heading", {
      level: 2,
      name: "Le train vers le Grand Lac Salé",
    });

    expect(screen.getByText("Waveform")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show waveform" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Listen" }));

    await waitFor(() => expect(ttsAdapter.generate).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Waveform")).toBeInTheDocument();
    expect(screen.getByLabelText("Reference progress")).toBeDisabled();
  });

  it("shows reference generation progress and a playable audio control", async () => {
    const user = userEvent.setup();
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play");
    let resolveReference: () => void = () => undefined;
    const ttsAdapter: TtsAdapter = {
      generate: vi.fn(
        () =>
          new Promise<GeneratedAudio>((resolve) => {
            resolveReference = () =>
              resolve({
                audioPath: "/tmp/reference.wav",
                playbackUrl: "http://127.0.0.1:8765/audio/reference.wav",
                durationMs: 1800,
              });
          }),
      ),
    };
    render(<App ttsAdapter={ttsAdapter} />);

    await screen.findByRole("heading", {
      level: 2,
      name: "Le train vers le Grand Lac Salé",
    });

    await user.click(screen.getByRole("button", { name: "Listen" }));

    expect(
      screen.getByRole("button", { name: "Preparing" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Generating reference audio")).toBeInTheDocument();

    resolveReference();

    await waitFor(() =>
      expect(screen.getByLabelText("Reference progress")).toBeEnabled(),
    );
    expect(screen.getByLabelText("Reference progress")).toHaveAttribute("max", "1.8");
    playSpy.mockClear();
    await user.click(screen.getByRole("button", { name: "Listen" }));
    expect(ttsAdapter.generate).toHaveBeenCalledTimes(1);
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Waveform")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Record" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Replay" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compare" })).not.toBeInTheDocument();
    expect(screen.queryByText("Your Recording")).not.toBeInTheDocument();
  });

  it("downloads and loads Chatterbox before generating audio when the backend has no loaded model", async () => {
    const user = userEvent.setup();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          backend: "chatterbox",
          model: "ResembleAI/chatterbox",
          status: "missing",
          modelLoaded: false,
          downloadEndpoint: "/models/chatterbox/download",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          backend: "chatterbox",
          model: "ResembleAI/chatterbox",
          status: "ready",
          modelLoaded: true,
          downloadEndpoint: "/models/chatterbox/download",
        }),
      });
    vi.stubGlobal("fetch", fetcher);
    const ttsAdapter: TtsAdapter = {
      generate: vi.fn(async () => ({
        audioPath: "/tmp/reference.wav",
        playbackUrl: "http://127.0.0.1:8765/audio/reference.wav",
        durationMs: 1800,
      })),
    };

    try {
      render(<App ttsAdapter={ttsAdapter} />);

      await user.click(
        await screen.findByRole("button", {
          name: "Le train vers le Grand Lac Salé, 17 sentences",
        }),
      );
      await waitFor(() => expect(screen.getByText("Not installed")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Listen" }));

      await waitFor(() =>
        expect(fetcher).toHaveBeenCalledWith(
          "http://127.0.0.1:8765/models/chatterbox/download",
          expect.objectContaining({ method: "POST" }),
        ),
      );
      await waitFor(() => expect(ttsAdapter.generate).toHaveBeenCalledTimes(1));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("lets the user drag the reference progress before browser metadata loads", async () => {
    const user = userEvent.setup();
    const ttsAdapter: TtsAdapter = {
      generate: vi.fn(async () => ({
        audioPath: "/tmp/reference.wav",
        playbackUrl: "http://127.0.0.1:8765/audio/reference.wav",
        durationMs: 2400,
      })),
    };
    render(<App ttsAdapter={ttsAdapter} />);

    await screen.findByRole("heading", {
      level: 2,
      name: "Le train vers le Grand Lac Salé",
    });

    await user.click(screen.getByRole("button", { name: "Listen" }));

    const progress = await screen.findByLabelText("Reference progress");
    await waitFor(() => expect(progress).toHaveAttribute("max", "2.4"));

    fireEvent.change(progress, { target: { value: "1.2" } });

    expect(progress).toHaveValue("1.2");
  });

  it("uses popover controls for playback speed and volume", async () => {
    const user = userEvent.setup();
    const ttsAdapter: TtsAdapter = {
      generate: vi.fn(async () => ({
        audioPath: "/tmp/reference.wav",
        playbackUrl: "http://127.0.0.1:8765/audio/reference.wav",
        durationMs: 1800,
      })),
    };
    render(<App ttsAdapter={ttsAdapter} />);

    await user.click(
      await screen.findByRole("button", {
        name: "Le train vers le Grand Lac Salé, 17 sentences",
      }),
    );
    await screen.findByRole("heading", {
      level: 2,
      name: "Le train vers le Grand Lac Salé",
    });

    await user.click(screen.getByRole("button", { name: "Show waveform" }));

    await user.click(screen.getByRole("button", { name: "Playback speed" }));
    expect(screen.getByRole("menu", { name: "Playback speed" })).toBeInTheDocument();
    await user.click(screen.getByRole("region", { name: "Current line" }));
    expect(screen.queryByRole("menu", { name: "Playback speed" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Playback speed" }));
    await user.click(screen.getByRole("menuitemradio", { name: "0.75x" }));
    expect(screen.getByRole("button", { name: "Playback speed" })).toHaveTextContent("0.75x");

    await user.click(screen.getByRole("button", { name: "Reference volume menu" }));
    expect(screen.getByRole("slider", { name: "Reference volume" })).toBeInTheDocument();
    await user.click(screen.getByRole("region", { name: "Current line" }));
    expect(screen.queryByRole("slider", { name: "Reference volume" })).not.toBeInTheDocument();
  });

  it("remembers voice, expression, speed, and volume preferences", async () => {
    const user = userEvent.setup();
    const ttsAdapter: TtsAdapter = {
      generate: vi.fn(async () => ({
        audioPath: "/tmp/reference.wav",
        playbackUrl: "http://127.0.0.1:8765/audio/reference.wav",
        durationMs: 1800,
      })),
    };
    const { unmount } = render(<App ttsAdapter={ttsAdapter} />);

    await screen.findByRole("heading", {
      level: 2,
      name: "Le train vers le Grand Lac Salé",
    });

    await user.selectOptions(screen.getByLabelText("Expression"), "expressive");
    await user.click(screen.getByRole("button", { name: "Show waveform" }));
    await user.click(screen.getByRole("button", { name: "Playback speed" }));
    await user.click(screen.getByRole("menuitemradio", { name: "1.5x" }));
    await user.click(screen.getByRole("button", { name: "Reference volume menu" }));
    fireEvent.change(screen.getByRole("slider", { name: "Reference volume" }), {
      target: { value: "0.42" },
    });

    unmount();
    render(<App ttsAdapter={ttsAdapter} />);

    await screen.findByRole("heading", {
      level: 2,
      name: "Le train vers le Grand Lac Salé",
    });

    expect(screen.getByLabelText("Voice")).toHaveValue("default");
    expect(screen.getByLabelText("Expression")).toHaveValue("expressive");
    await user.click(screen.getByRole("button", { name: "Show waveform" }));
    expect(screen.getByRole("button", { name: "Playback speed" })).toHaveTextContent("1.5x");
    await user.click(screen.getByRole("button", { name: "Reference volume menu" }));
    expect(screen.getByRole("slider", { name: "Reference volume" })).toHaveValue("0.42");
  });

  it("does not autoplay when the waveform is folded and shown again", async () => {
    const user = userEvent.setup();
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play");
    const ttsAdapter: TtsAdapter = {
      generate: vi.fn(async () => ({
        audioPath: "/tmp/reference.wav",
        playbackUrl: "http://127.0.0.1:8765/audio/reference.wav",
        durationMs: 1800,
      })),
    };
    render(<App ttsAdapter={ttsAdapter} />);

    await screen.findByRole("heading", {
      level: 2,
      name: "Le train vers le Grand Lac Salé",
    });

    await user.click(screen.getByRole("button", { name: "Listen" }));

    await waitFor(() => expect(screen.getByLabelText("Reference progress")).toBeEnabled());
    playSpy.mockClear();

    await user.click(screen.getByRole("button", { name: "Fold waveform" }));
    await user.click(screen.getByRole("button", { name: "Show waveform" }));

    expect(playSpy).not.toHaveBeenCalled();
  });

  it("does not autoplay from an old listen request after reopening practice", async () => {
    const user = userEvent.setup();
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play");
    const ttsAdapter: TtsAdapter = {
      generate: vi.fn(async () => ({
        audioPath: "/tmp/reference.wav",
        playbackUrl: "http://127.0.0.1:8765/audio/reference.wav",
        durationMs: 1800,
      })),
    };
    render(<App ttsAdapter={ttsAdapter} />);

    await screen.findByRole("heading", {
      level: 2,
      name: "Le train vers le Grand Lac Salé",
    });
    await user.click(screen.getByRole("button", { name: "Listen" }));
    await waitFor(() => expect(screen.getByLabelText("Reference progress")).toBeEnabled());
    playSpy.mockClear();

    await user.click(screen.getByRole("button", { name: "New passage" }));
    await user.click(
      screen.getByRole("button", {
        name: "Le train vers le Grand Lac Salé, 17 sentences",
      }),
    );

    expect(playSpy).not.toHaveBeenCalled();
  });

  it("shows a clear recording error when browser recording is unavailable", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("heading", {
      level: 2,
      name: "Le train vers le Grand Lac Salé",
    });

    await user.click(screen.getByRole("button", { name: "Record" }));

    expect(
      screen.getByText("Recording is not available in this browser."),
    ).toBeInTheDocument();
    expect(screen.getByText("Waveform")).toBeInTheDocument();
  });

  it("uses content-length based text sizing for the player text", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("heading", {
      level: 2,
      name: "Le train vers le Grand Lac Salé",
    });

    expect(
      screen
        .getAllByText(/Pendant la nuit du 5 au 6 décembre/)
        .find((element) => element.className === "selected-sentence-text")
        ?.closest(".selected-sentence-card"),
    ).toHaveClass("balanced");

    await user.click(screen.getByRole("button", { name: "On eût dit un révérend." }));

    expect(
      screen
        .getAllByText("On eût dit un révérend.")
        .find((element) => element.className === "selected-sentence-text")
      ?.closest(".selected-sentence-card"),
    ).toHaveClass("large");
  });

  it("uses a clear text, lines, controls hierarchy without helper copy", async () => {
    render(<App />);

    const textRegion = await screen.findByRole("region", { name: "Current line" });
    const linesRegion = screen.getByRole("region", { name: "Line by line" });
    const controlsRegion = screen.getByRole("region", {
      name: "Practice controls",
    });

    expect(screen.queryByText(/Pick a line/)).not.toBeInTheDocument();
    expect(screen.queryByText("Subtitle")).not.toBeInTheDocument();
    expect(textRegion.compareDocumentPosition(linesRegion)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(linesRegion.compareDocumentPosition(controlsRegion)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("keeps voice and expression controls compact with the real Chatterbox voice", async () => {
    render(<App />);

    await screen.findByRole("heading", {
      level: 2,
      name: "Le train vers le Grand Lac Salé",
    });

    expect(screen.getByLabelText("Voice")).toHaveValue("default");
    expect(screen.getByRole("option", { name: "Default" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Female" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Male" })).not.toBeInTheDocument();
  });

  it("supports arrow key navigation between lines", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "New passage" }));
    await user.type(screen.getByLabelText("Title"), "Cafe dialogue");
    await user.type(screen.getByLabelText("Content"), "Bonjour. Bonsoir.");
    await user.click(screen.getByRole("button", { name: "Start practice" }));

    const firstSentence = screen.getByRole("button", { name: "Bonjour." });
    const secondSentence = screen.getByRole("button", { name: "Bonsoir." });

    expect(firstSentence).toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{ArrowRight}");

    expect(secondSentence).toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{ArrowLeft}");

    expect(firstSentence).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Text import", () => {
  it("presents a dedicated composer surface without adding extra fields", () => {
    render(<TextImport onCreate={vi.fn()} />);

    const composer = screen.getByRole("group", { name: "Passage composer" });

    expect(composer).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start practice" })).toBeDisabled();
  });

  it("disables fields while async create is pending", async () => {
    const user = userEvent.setup();
    let resolveCreate: () => void = () => undefined;
    const onCreate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    render(<TextImport onCreate={onCreate} />);

    const titleInput = screen.getByLabelText("Title");
    const bodyInput = screen.getByLabelText("Content");
    const submitButton = screen.getByRole("button", {
      name: "Start practice",
    });

    await user.type(bodyInput, "Bonjour.");
    await user.click(submitButton);

    expect(titleInput).toBeDisabled();
    expect(bodyInput).toBeDisabled();
    expect(submitButton).toBeDisabled();

    resolveCreate();
    await waitFor(() => expect(titleInput).not.toBeDisabled());
    expect(bodyInput).not.toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it("clears fields after async create succeeds", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn(async () => undefined);
    render(<TextImport onCreate={onCreate} />);

    const titleInput = screen.getByLabelText("Title");
    const bodyInput = screen.getByLabelText("Content");

    await user.type(titleInput, "Cafe dialogue");
    await user.type(bodyInput, "Bonjour.");
    await user.click(screen.getByRole("button", { name: "Start practice" }));

    expect(onCreate).toHaveBeenCalledWith({
      title: "Cafe dialogue",
      body: "Bonjour.",
    });
    expect(titleInput).toHaveValue("");
    expect(bodyInput).toHaveValue("");
  });

  it("allows an empty title and leaves naming to the app", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn(async () => undefined);
    render(<TextImport onCreate={onCreate} />);

    await user.type(screen.getByLabelText("Content"), "Bonjour.");
    await user.click(screen.getByRole("button", { name: "Start practice" }));

    expect(onCreate).toHaveBeenCalledWith({
      title: "",
      body: "Bonjour.",
    });
  });

  it("preserves fields and shows an error after async create fails", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn(async () => {
      throw new Error("Save failed");
    });
    render(<TextImport onCreate={onCreate} />);

    const titleInput = screen.getByLabelText("Title");
    const bodyInput = screen.getByLabelText("Content");

    await user.type(titleInput, "Cafe dialogue");
    await user.type(bodyInput, "Bonjour.");
    await user.click(screen.getByRole("button", { name: "Start practice" }));

    expect(titleInput).toHaveValue("Cafe dialogue");
    expect(bodyInput).toHaveValue("Bonjour.");
    expect(screen.getByRole("alert")).toHaveTextContent("Could not create passage.");
  });

  it("does not show decorative badges or fake creation icons", () => {
    render(<TextImport onCreate={vi.fn()} />);

    expect(screen.queryByText("B2-ready local pronunciation lab")).not.toBeInTheDocument();
    expect(screen.queryByText(/Add a French passage/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Paste French text/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "New passage" })).not.toBeInTheDocument();
    expect(screen.queryByText("French passage")).not.toBeInTheDocument();
    expect(screen.getByText("0 lines")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Paste a French article, dialogue, or lesson text..."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start practice" })).toBeInTheDocument();
  });
});
