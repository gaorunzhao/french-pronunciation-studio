import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("App", () => {
  it("renders New passage navigation and passages in the sidebar", async () => {
    render(<App />);

    const importButton = screen.getByRole("button", { name: "New passage" });
    const sidebar = screen.getByRole("complementary", {
      name: "App sidebar",
    });

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
    expect(importButton).toBeInTheDocument();
    expect(importButton).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Voix Claire")).toBeInTheDocument();
    expect(sidebar).toBeInTheDocument();
    expect(
      within(sidebar).getByRole("region", { name: "Passages" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Practice workspace" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "Feedback" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Le train vers le Grand Lac Salé",
      }),
    ).toBeInTheDocument();
  });

  it("opens on New passage while keeping the default long French session available", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByText("No passages yet.")).not.toBeInTheDocument();
    expect(
      within(
        screen.getByRole("region", { name: "Practice workspace" }),
      ).queryByRole("region", { name: "Passages" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Le train vers le Grand Lac Salé, 17 sentences",
      }),
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Le train vers le Grand Lac Salé",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Pendant la nuit du 5 au 6 décembre/,
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("uses a resizable source-list sidebar that can be collapsed and restored", async () => {
    const user = userEvent.setup();
    render(<App />);

    const sidebar = screen.getByRole("complementary", {
      name: "App sidebar",
    });
    const appShell = screen.getByRole("main");
    const resizer = screen.getByRole("separator", { name: "Resize sidebar" });

    expect(sidebar).not.toHaveAttribute("hidden");
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toHaveClass(
      "sidebar-icon-button",
    );
    expect(screen.queryByRole("button", { name: "Show sidebar" })).not.toBeInTheDocument();
    expect(resizer).toHaveAttribute("aria-orientation", "vertical");
    expect(screen.getByRole("button", { name: "New passage" })).toBeInTheDocument();

    fireEvent.pointerDown(resizer, { clientX: 312, pointerId: 1 });

    expect(appShell).toHaveAttribute("data-sidebar-resizing", "true");

    fireEvent.pointerMove(window, { clientX: 312, pointerId: 1 });
    fireEvent.pointerUp(window, { pointerId: 1 });

    expect(appShell).toHaveStyle({ "--sidebar-width": "312px" });
    expect(appShell).not.toHaveAttribute("data-sidebar-resizing");

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(appShell).toHaveAttribute("data-sidebar-collapsed", "true");
    expect(sidebar).toHaveAttribute("hidden");
    expect(screen.queryByRole("separator", { name: "Resize sidebar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show sidebar" })).toHaveClass(
      "sidebar-restore-button",
    );
    expect(screen.queryByText("Hide")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show sidebar" }));

    expect(appShell).not.toHaveAttribute("data-sidebar-collapsed");
    expect(sidebar).not.toHaveAttribute("hidden");
    expect(appShell).toHaveStyle({ "--sidebar-width": "312px" });
  });

  it("keeps New passage as a dedicated creation screen", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "New passage" }));

    const workspace = screen.getByRole("region", {
      name: "Practice workspace",
    });
    expect(screen.getByRole("button", { name: "New passage" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(workspace).getByRole("textbox", { name: "Title" }),
    ).toBeInTheDocument();
    expect(
      within(workspace).getByRole("textbox", { name: "Content" }),
    ).toBeInTheDocument();
    expect(
      within(workspace).queryByRole("button", {
        name: /Pendant la nuit du 5 au 6 décembre/,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(workspace).queryByRole("button", { name: "New text" }),
    ).not.toBeInTheDocument();
  });

  it("creates a passage from New passage and moves into practice", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "New passage" }));
    await user.type(screen.getByLabelText("Title"), "Dialogue au cafe");
    await user.type(
      screen.getByLabelText("Content"),
      "Bonjour. Je voudrais un cafe creme.",
    );
    await user.click(screen.getByRole("button", { name: "Start practice" }));

    expect(screen.getByRole("button", { name: "New passage" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(
      screen.getByRole("button", { name: "Dialogue au cafe, 2 sentences" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bonjour." })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
