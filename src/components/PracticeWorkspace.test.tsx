import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

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
    expect(screen.getByRole("button", { name: "Bonjour." })).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Je voudrais un cafe creme, s'il vous plait.",
      }),
    ).toBeInTheDocument();
  });
});
