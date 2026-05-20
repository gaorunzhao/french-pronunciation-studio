import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import type { GenerateTtsInput } from "../modelAdapters/types";

async function chooseSelectOption(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  optionName: string,
) {
  await user.click(screen.getByRole("combobox", { name: label }));
  await user.click(
    await screen.findByRole("option", {
      name: new RegExp(`^${escapeRegExp(optionName)}\\b`),
    }),
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("Reference playback flow", () => {
  it("passes default expression strength and speed to the TTS adapter", async () => {
    const user = userEvent.setup();
    const ttsAdapter = {
      generate: vi.fn(async (_input: GenerateTtsInput) => ({
        audioPath: "mock://tts/reference.wav",
        durationMs: 1200,
      })),
    };

    render(
      <App
        {...({
          ttsAdapter,
        } as Parameters<typeof App>[0])}
      />,
    );

    await screen.findByRole("heading", {
      level: 2,
      name: "Le train vers le Grand Lac Salé",
    });
    await chooseSelectOption(user, "Model", "Kokoro");
    await chooseSelectOption(user, "Expression", "Default");
    const speedButton = screen.getByRole("button", { name: "Playback speed" });
    expect(speedButton).toHaveTextContent("1.0x");
    await user.click(speedButton);
    await user.click(screen.getByRole("menuitemradio", { name: "1.5x" }));
    await user.click(screen.getByRole("button", { name: "Listen" }));

    await waitFor(() => expect(ttsAdapter.generate).toHaveBeenCalledTimes(1));
    expect(ttsAdapter.generate.mock.calls[0][0].voice).toMatchObject({
      voiceId: "default",
      styleStrength: 0,
      speed: 1.5,
    });
  });

  it("ignores stale reference generation after selecting another sentence", async () => {
    const user = userEvent.setup();
    let resolveReference: (() => void) | undefined;
    const slowTtsAdapter = {
      generate: vi.fn(
        (_input: GenerateTtsInput) =>
          new Promise<{ audioPath: string; playbackUrl: string; durationMs: number }>(
            (resolve) => {
              resolveReference = () =>
                resolve({
                  audioPath: "mock://tts/slow.wav",
                  playbackUrl: "http://127.0.0.1:8765/audio/slow.wav",
                  durationMs: 1000,
                });
            },
          ),
      ),
    };

    render(
      <App
        {...({
          ttsAdapter: slowTtsAdapter,
        } as Parameters<typeof App>[0])}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "New passage" }));
    await user.type(screen.getByLabelText("Title"), "Cafe dialogue");
    await user.type(screen.getByLabelText("Content"), "Bonjour. Bonsoir.");
    await user.click(screen.getByRole("button", { name: "Start practice" }));

    await user.click(screen.getByRole("button", { name: "Listen" }));

    expect(slowTtsAdapter.generate).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Bonsoir." }));

    resolveReference?.();

    await waitFor(() =>
      expect(
        screen.getByLabelText("Reference progress"),
      ).toBeDisabled(),
    );
    expect(screen.queryByText("Waveform")).not.toBeInTheDocument();
  });

  it("clears audio state when selecting a different sentence", async () => {
    const user = userEvent.setup();
    const ttsAdapter = {
      generate: vi.fn(async () => ({
        audioPath: "mock://tts/reference.wav",
        playbackUrl: "http://127.0.0.1:8765/audio/reference.wav",
        durationMs: 1000,
      })),
    };

    render(
      <App
        {...({
          ttsAdapter,
        } as Parameters<typeof App>[0])}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "New passage" }));
    await user.type(screen.getByLabelText("Title"), "Cafe dialogue");
    await user.type(screen.getByLabelText("Content"), "Bonjour. Bonsoir.");
    await user.click(screen.getByRole("button", { name: "Start practice" }));

    await user.click(screen.getByRole("button", { name: "Listen" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Reference progress")).toBeEnabled(),
    );

    await user.click(screen.getByRole("button", { name: "Bonsoir." }));

    expect(screen.getByLabelText("Reference progress")).toBeDisabled();
    expect(screen.queryByText("Waveform")).not.toBeInTheDocument();
  });

  it("does not show a loop control in the transport bar", async () => {
    render(<App />);

    await screen.findByRole("heading", {
      level: 2,
      name: "Le train vers le Grand Lac Salé",
    });

    expect(screen.getByRole("button", { name: "Listen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Loop" })).not.toBeInTheDocument();
  });
});
