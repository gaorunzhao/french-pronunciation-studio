import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the simple Texts and Sessions navigation", () => {
    render(<App />);

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Main navigation" })
    ).toBeInTheDocument();

    const textsButton = screen.getByRole("button", { name: "Texts" });
    const sessionsButton = screen.getByRole("button", { name: "Sessions" });

    expect(textsButton).toBeInTheDocument();
    expect(textsButton).toHaveAttribute("aria-current", "page");
    expect(textsButton).toHaveAttribute("aria-pressed", "true");
    expect(sessionsButton).toBeInTheDocument();
    expect(sessionsButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("French Pronunciation Studio")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Primary" })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Practice workspace" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Feedback" })
    ).toBeInTheDocument();
  });
});
