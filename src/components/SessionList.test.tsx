import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { InMemoryRepository } from "../data/inMemoryRepository";
import type { PracticeSession } from "../domain/types";

class CountingRepository extends InMemoryRepository {
  createSessionCount = 0;

  async createSession(textId: string): Promise<PracticeSession> {
    this.createSessionCount += 1;
    return super.createSession(textId);
  }
}

async function createPracticeSession(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
  body: string,
) {
  await user.click(screen.getByRole("button", { name: "New passage" }));
  await user.type(screen.getByLabelText("Title"), title);
  await user.type(screen.getByLabelText("Content"), body);
  await user.click(screen.getByRole("button", { name: "Start practice" }));
}

describe("Passages sidebar", () => {
  it("shows the default session before any attempt exists", async () => {
    render(<App />);

    expect(
      await screen.findByRole("button", {
        name: "Le train vers le Grand Lac Salé, 17 sentences",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No passages yet.")).not.toBeInTheDocument();
  });

  it("creates one session when a text is imported", async () => {
    const user = userEvent.setup();
    const repository = new CountingRepository();
    render(<App repository={repository} />);

    await createPracticeSession(user, "Cafe dialogue", "Bonjour.");

    expect(
      screen.getByRole("button", { name: "Cafe dialogue, 1 sentence" }),
    ).toBeInTheDocument();
    expect(repository.createSessionCount).toBe(1);
    expect(await repository.listSessions()).toHaveLength(1);
  });

  it("uses a generated passage name when the title is empty", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "New passage" }));
    await user.type(screen.getByLabelText("Content"), "Bonjour.");
    await user.click(screen.getByRole("button", { name: "Start practice" }));

    expect(
      screen.getByRole("button", { name: "Passage 2, 1 sentence" }),
    ).toBeInTheDocument();
  });

  it("lets the user switch between saved sessions", async () => {
    const user = userEvent.setup();
    render(<App />);

    await createPracticeSession(user, "Cafe dialogue", "Bonjour.");
    await createPracticeSession(user, "A la gare", "Le train partira demain.");

    await user.click(screen.getByRole("button", { name: /Cafe dialogue, 1 sentence/ }));

    expect(screen.getByRole("button", { name: "Bonjour." })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByRole("button", { name: "Le train partira demain." })).not.toBeInTheDocument();
  });

  it("places newly imported passages first", async () => {
    const user = userEvent.setup();
    render(<App />);

    await createPracticeSession(user, "Cafe dialogue", "Bonjour.");

    const passageButtons = screen.getAllByRole("button", {
      name: /sentences?|sentence/,
    });

    expect(passageButtons[0]).toHaveAccessibleName("Cafe dialogue, 1 sentence");
  });

  it("lets the user drag passages into a custom order", async () => {
    const user = userEvent.setup();
    render(<App />);

    await createPracticeSession(user, "Cafe dialogue", "Bonjour.");
    await createPracticeSession(user, "A la gare", "Le train partira demain.");

    const source = screen.getByRole("button", { name: "A la gare, 1 sentence" });
    const target = screen.getByRole("button", { name: "Le train vers le Grand Lac Salé, 17 sentences" });
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    const passageButtons = screen.getAllByRole("button", {
      name: /sentences?|sentence/,
    });

    expect(passageButtons.at(-1)).toHaveAccessibleName("A la gare, 1 sentence");
  });

  it("uses New passage as the only page navigation state", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "New passage" }));

    expect(screen.getByRole("button", { name: "New passage" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("button", {
        name: "Le train vers le Grand Lac Salé, 17 sentences",
      }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", {
        name: "Le train vers le Grand Lac Salé, 17 sentences",
      }),
    ).toHaveAttribute("data-state", "off");
    expect(screen.queryByRole("button", { name: "Sessions" })).not.toBeInTheDocument();
  });
});

function createDataTransfer(): DataTransfer {
  const store = new Map<string, string>();
  return {
    dropEffect: "move",
    effectAllowed: "move",
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [],
    clearData: vi.fn((type?: string) => {
      if (type) {
        store.delete(type);
      } else {
        store.clear();
      }
    }),
    getData: vi.fn((type: string) => store.get(type) ?? ""),
    setData: vi.fn((type: string, value: string) => {
      store.set(type, value);
    }),
    setDragImage: vi.fn(),
  };
}
