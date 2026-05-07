import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import type { AnalyzeInput, GenerateTtsInput } from "../modelAdapters/types";

describe("Lab flow", () => {
  it("shows neutral feedback before compare", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.getByText("Record and compare to see feedback."),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Record and compare to see feedback.",
    );
    expect(screen.queryByText("No repeat needed.")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Text title"), "Cafe dialogue");
    await user.type(screen.getByLabelText("French text"), "Bonjour.");
    await user.click(
      screen.getByRole("button", { name: "Create practice text" }),
    );

    expect(
      screen.getByText("Record and compare to see feedback."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No repeat needed.")).not.toBeInTheDocument();
  });

  it("generates mock reference audio, records, compares, and shows feedback", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Text title"), "Cafe dialogue");
    await user.type(screen.getByLabelText("French text"), "Bonjour.");
    await user.click(
      screen.getByRole("button", { name: "Create practice text" }),
    );

    await user.click(screen.getByRole("button", { name: "Play reference" }));
    await user.click(screen.getByRole("button", { name: "Record" }));
    await user.click(screen.getByRole("button", { name: "Compare" }));

    expect(screen.getByText("Reference Audio")).toBeInTheDocument();
    expect(screen.getByText("Your Recording")).toBeInTheDocument();
    expect(screen.getByText("No repeat needed.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("No repeat needed.");
  });

  it("disables compare until a recording exists", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Text title"), "Cafe dialogue");
    await user.type(screen.getByLabelText("French text"), "Bonjour.");
    await user.click(
      screen.getByRole("button", { name: "Create practice text" }),
    );

    const compareButton = screen.getByRole("button", { name: "Compare" });

    expect(compareButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Record" }));

    expect(compareButton).not.toBeDisabled();
  });

  it("ignores stale reference generation after selecting another sentence", async () => {
    const user = userEvent.setup();
    let resolveReference: (() => void) | undefined;
    const slowTtsAdapter = {
      generate: vi.fn(
        (_input: GenerateTtsInput) =>
          new Promise<{ audioPath: string; durationMs: number }>((resolve) => {
            resolveReference = () =>
              resolve({ audioPath: "mock://tts/slow.wav", durationMs: 1000 });
          }),
      ),
    };

    render(
      <App
        {...({
          ttsAdapter: slowTtsAdapter,
        } as Parameters<typeof App>[0])}
      />,
    );

    await user.type(screen.getByLabelText("Text title"), "Cafe dialogue");
    await user.type(screen.getByLabelText("French text"), "Bonjour. Bonsoir.");
    await user.click(
      screen.getByRole("button", { name: "Create practice text" }),
    );

    await user.click(screen.getByRole("button", { name: "Play reference" }));

    expect(slowTtsAdapter.generate).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Bonsoir." }));

    resolveReference?.();

    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: "Reference audio not generated" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("img", { name: "Reference audio ready" }),
    ).not.toBeInTheDocument();
  });

  it("ignores stale comparison results after selecting another sentence", async () => {
    const user = userEvent.setup();
    let resolveAnalysis: (() => void) | undefined;
    const asrAdapter = {
      transcribe: vi.fn(async () => ({ text: "Bonjour", durationMs: 1000 })),
    };
    const analyzerAdapter = {
      analyze: vi.fn(
        (_input: AnalyzeInput) =>
          new Promise<{
            words: [{ expected: string; status: "match" }];
            mismatchCount: number;
            timingStatus: "similar";
            needsRepeat: boolean;
          }>((resolve) => {
            resolveAnalysis = () =>
              resolve({
                words: [{ expected: "Bonjour", status: "match" }],
                mismatchCount: 0,
                timingStatus: "similar",
                needsRepeat: false,
              });
          }),
      ),
    };

    render(
      <App
        {...({
          asrAdapter,
          analyzerAdapter,
        } as Parameters<typeof App>[0])}
      />,
    );

    await user.type(screen.getByLabelText("Text title"), "Cafe dialogue");
    await user.type(screen.getByLabelText("French text"), "Bonjour. Bonsoir.");
    await user.click(
      screen.getByRole("button", { name: "Create practice text" }),
    );

    await user.click(screen.getByRole("button", { name: "Record" }));
    await user.click(screen.getByRole("button", { name: "Compare" }));

    expect(asrAdapter.transcribe).toHaveBeenCalledTimes(1);
    expect(analyzerAdapter.analyze).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Bonsoir." }));

    resolveAnalysis?.();

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Record and compare to see feedback.",
      ),
    );
    expect(screen.queryByText("No repeat needed.")).not.toBeInTheDocument();
  });

  it("clears feedback and waveform state when selecting a different sentence", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Text title"), "Cafe dialogue");
    await user.type(screen.getByLabelText("French text"), "Bonjour. Bonsoir.");
    await user.click(
      screen.getByRole("button", { name: "Create practice text" }),
    );

    await user.click(screen.getByRole("button", { name: "Play reference" }));
    await user.click(screen.getByRole("button", { name: "Record" }));
    await user.click(screen.getByRole("button", { name: "Compare" }));

    expect(screen.getByText("No repeat needed.")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Reference audio ready" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Your recording ready" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bonsoir." }));

    expect(
      screen.getByText("Record and compare to see feedback."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No repeat needed.")).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Reference audio not generated" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Your recording not captured" }),
    ).toBeInTheDocument();
  });

  it("updates waveform accessible labels after play reference and record", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Text title"), "Cafe dialogue");
    await user.type(screen.getByLabelText("French text"), "Bonjour.");
    await user.click(
      screen.getByRole("button", { name: "Create practice text" }),
    );

    expect(
      screen.getByRole("img", { name: "Reference audio not generated" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Your recording not captured" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Play reference" }));

    expect(
      screen.getByRole("img", { name: "Reference audio ready" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Your recording not captured" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Record" }));

    expect(
      screen.getByRole("img", { name: "Reference audio ready" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Your recording ready" }),
    ).toBeInTheDocument();
  });

  it("toggles loop state from the transport bar", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Text title"), "Cafe dialogue");
    await user.type(screen.getByLabelText("French text"), "Bonjour.");
    await user.click(
      screen.getByRole("button", { name: "Create practice text" }),
    );

    const loopButton = screen.getByRole("button", { name: "Loop" });

    expect(loopButton).toHaveAttribute("aria-pressed", "false");

    await user.click(loopButton);

    expect(loopButton).toHaveAttribute("aria-pressed", "true");

    await user.click(loopButton);

    expect(loopButton).toHaveAttribute("aria-pressed", "false");
  });

  it("resets speed when importing a new text", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Text title"), "Cafe dialogue");
    await user.type(screen.getByLabelText("French text"), "Bonjour.");
    await user.click(
      screen.getByRole("button", { name: "Create practice text" }),
    );

    fireEvent.change(screen.getByRole("slider"), { target: { value: "1.15" } });

    expect(screen.getByText("Speed 1.15x")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Text title"), "Market dialogue");
    await user.type(screen.getByLabelText("French text"), "Bonsoir.");
    await user.click(
      screen.getByRole("button", { name: "Create practice text" }),
    );

    expect(screen.getByText("Speed 0.90x")).toBeInTheDocument();
  });
});
