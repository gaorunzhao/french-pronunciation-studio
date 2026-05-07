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
    expect(textsButton).not.toHaveAttribute("aria-pressed");
    expect(sessionsButton).toBeInTheDocument();
    expect(sessionsButton).not.toHaveAttribute("aria-pressed");
    expect(sessionsButton).not.toHaveAttribute("aria-current");
    expect(screen.getByText("French Pronunciation Studio")).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "App sidebar" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Practice workspace" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Feedback" })
    ).toBeInTheDocument();
  });
});
