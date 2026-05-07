import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

describe("Lab flow", () => {
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
