import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the simple Texts and Sessions navigation", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Texts" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sessions" })
    ).toBeInTheDocument();
    expect(screen.getByText("French Pronunciation Studio")).toBeInTheDocument();
  });
});
