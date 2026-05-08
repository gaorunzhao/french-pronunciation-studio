import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("collapses the sidebar while keeping navigation accessible", async () => {
    const user = userEvent.setup();
    render(<App />);

    const sidebar = screen.getByRole("complementary", {
      name: "App sidebar",
    });
    const collapseButton = screen.getByRole("button", {
      name: "Collapse sidebar",
    });

    expect(sidebar).toHaveAttribute("data-collapsed", "false");
    expect(collapseButton).toHaveAttribute("aria-expanded", "true");

    await user.click(collapseButton);

    const expandButton = screen.getByRole("button", {
      name: "Expand sidebar",
    });
    expect(sidebar).toHaveAttribute("data-collapsed", "true");
    expect(expandButton).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button", { name: "Sessions" }));

    expect(
      screen.getByRole("button", { name: "Sessions" }),
    ).toHaveAttribute("aria-current", "page");

    await user.click(expandButton);

    expect(sidebar).toHaveAttribute("data-collapsed", "false");
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});
