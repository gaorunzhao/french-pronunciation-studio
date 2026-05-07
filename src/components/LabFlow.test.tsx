import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

describe("Lab flow", () => {
  it("shows neutral feedback before compare", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.getByText("Record and compare to see feedback."),
    ).toBeInTheDocument();
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
