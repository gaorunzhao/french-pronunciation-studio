import { render, screen } from "@testing-library/react";
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
});
