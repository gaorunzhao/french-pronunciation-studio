import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { TextImport } from "./TextImport";

describe("Practice workspace", () => {
  it("imports pasted text and shows sentence cards", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Text title"), "Cafe dialogue");
    await user.type(
      screen.getByLabelText("French text"),
      "Bonjour. Je voudrais un cafe creme, s'il vous plait.",
    );
    await user.click(
      screen.getByRole("button", { name: "Create practice text" }),
    );

    expect(screen.getByText("Cafe dialogue")).toBeInTheDocument();
    const firstSentence = screen.getByRole("button", { name: "Bonjour." });
    const secondSentence = screen.getByRole("button", {
      name: "Je voudrais un cafe creme, s'il vous plait.",
    });

    expect(firstSentence).toBeInTheDocument();
    expect(firstSentence).toHaveAttribute("aria-pressed", "true");
    expect(secondSentence).toBeInTheDocument();
    expect(secondSentence).toHaveAttribute("aria-pressed", "false");

    await user.click(secondSentence);

    expect(firstSentence).toHaveAttribute("aria-pressed", "false");
    expect(secondSentence).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Text import", () => {
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

    const titleInput = screen.getByLabelText("Text title");
    const bodyInput = screen.getByLabelText("French text");
    const submitButton = screen.getByRole("button", {
      name: "Create practice text",
    });

    await user.type(titleInput, "Cafe dialogue");
    await user.type(bodyInput, "Bonjour.");
    await user.click(submitButton);

    expect(titleInput).toBeDisabled();
    expect(bodyInput).toBeDisabled();
    expect(submitButton).toBeDisabled();

    resolveCreate();
    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it("clears fields after async create succeeds", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn(async () => undefined);
    render(<TextImport onCreate={onCreate} />);

    const titleInput = screen.getByLabelText("Text title");
    const bodyInput = screen.getByLabelText("French text");

    await user.type(titleInput, "Cafe dialogue");
    await user.type(bodyInput, "Bonjour.");
    await user.click(
      screen.getByRole("button", { name: "Create practice text" }),
    );

    expect(onCreate).toHaveBeenCalledWith({
      title: "Cafe dialogue",
      body: "Bonjour.",
    });
    expect(titleInput).toHaveValue("");
    expect(bodyInput).toHaveValue("");
  });

  it("preserves fields and shows an error after async create fails", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn(async () => {
      throw new Error("Save failed");
    });
    render(<TextImport onCreate={onCreate} />);

    const titleInput = screen.getByLabelText("Text title");
    const bodyInput = screen.getByLabelText("French text");

    await user.type(titleInput, "Cafe dialogue");
    await user.type(bodyInput, "Bonjour.");
    await user.click(
      screen.getByRole("button", { name: "Create practice text" }),
    );

    expect(titleInput).toHaveValue("Cafe dialogue");
    expect(bodyInput).toHaveValue("Bonjour.");
    expect(screen.getByRole("alert")).toHaveTextContent("Could not create text.");
  });
});
