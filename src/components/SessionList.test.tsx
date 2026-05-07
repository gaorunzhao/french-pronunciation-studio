import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

describe("Sessions screen", () => {
  it("shows a session after a comparison attempt", async () => {
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
    await user.click(screen.getByRole("button", { name: "Sessions" }));

    expect(screen.getByText("Practice Sessions")).toBeInTheDocument();
    expect(screen.getByText("Cafe dialogue")).toBeInTheDocument();
    expect(screen.getByText("1 attempt")).toBeInTheDocument();
  });
});
