import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("App", () => {
  it("renders the simple Texts and Sessions navigation", async () => {
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
    expect(
      await screen.findByText("Rendez-vous a la mairie"),
    ).toBeInTheDocument();
  });

  it("opens with a seeded practical French passage for first-time practice", async () => {
    render(<App />);

    expect(
      await screen.findByText("Rendez-vous a la mairie"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Demain matin, je dois appeler la mairie/,
      }),
    ).toHaveAttribute("aria-pressed", "true");
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

  it("keeps import controls in the workspace instead of the sidebar", async () => {
    render(<App />);

    const sidebar = screen.getByRole("complementary", {
      name: "App sidebar",
    });
    const workspace = screen.getByRole("region", {
      name: "Practice workspace",
    });

    expect(
      within(sidebar).queryByRole("textbox", { name: "Text title" }),
    ).not.toBeInTheDocument();
    expect(
      within(sidebar).queryByRole("textbox", { name: "French text" }),
    ).not.toBeInTheDocument();
    expect(
      within(workspace).getByRole("textbox", { name: "Text title" }),
    ).toBeInTheDocument();
    expect(
      within(workspace).getByRole("textbox", { name: "French text" }),
    ).toBeInTheDocument();
    expect(
      within(workspace).getByRole("button", { name: "Create practice text" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Rendez-vous a la mairie"),
    ).toBeInTheDocument();
  });
});
