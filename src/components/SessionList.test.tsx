import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { InMemoryRepository } from "../data/inMemoryRepository";
import type { AddAttemptInput } from "../data/repository";
import type { Attempt, PracticeSession } from "../domain/types";

class SlowSessionRepository extends InMemoryRepository {
  addAttemptCount = 0;
  createSessionStarted?: Promise<void>;
  resolveCreateSession?: () => void;

  async createSession(textId: string): Promise<PracticeSession> {
    this.createSessionStarted = Promise.resolve();
    await new Promise<void>((resolve) => {
      this.resolveCreateSession = resolve;
    });
    return super.createSession(textId);
  }

  async addAttempt(input: AddAttemptInput): Promise<Attempt> {
    this.addAttemptCount += 1;
    return super.addAttempt(input);
  }
}

class CountingRepository extends InMemoryRepository {
  createSessionCount = 0;
  addAttemptCount = 0;

  async createSession(textId: string): Promise<PracticeSession> {
    this.createSessionCount += 1;
    return super.createSession(textId);
  }

  async addAttempt(input: AddAttemptInput): Promise<Attempt> {
    this.addAttemptCount += 1;
    return super.addAttempt(input);
  }
}

async function createPracticeText(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
  body: string,
) {
  await user.type(screen.getByLabelText("Text title"), title);
  await user.type(screen.getByLabelText("French text"), body);
  await user.click(
    screen.getByRole("button", { name: "Create practice text" }),
  );
}

async function prepareRecording(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Play reference" }));
  await user.click(screen.getByRole("button", { name: "Record" }));
}

describe("Sessions screen", () => {
  it("shows a session after a comparison attempt", async () => {
    const user = userEvent.setup();
    render(<App />);

    await createPracticeText(user, "Cafe dialogue", "Bonjour.");
    await prepareRecording(user);
    await user.click(screen.getByRole("button", { name: "Compare" }));
    await user.click(screen.getByRole("button", { name: "Sessions" }));

    expect(screen.getByText("Practice Sessions")).toBeInTheDocument();
    expect(screen.getByText("Cafe dialogue")).toBeInTheDocument();
    expect(screen.getByText("1 attempt")).toBeInTheDocument();
  });

  it("reuses one active session for two compares on the same text", async () => {
    const user = userEvent.setup();
    const repository = new CountingRepository();
    render(<App repository={repository} />);

    await createPracticeText(user, "Cafe dialogue", "Bonjour.");
    await prepareRecording(user);

    const compareButton = screen.getByRole("button", { name: "Compare" });
    await Promise.all([user.click(compareButton), user.click(compareButton)]);
    await user.click(screen.getByRole("button", { name: "Sessions" }));

    expect(screen.getByText("Cafe dialogue")).toBeInTheDocument();
    expect(screen.getByText("2 attempts")).toBeInTheDocument();
    expect(repository.createSessionCount).toBe(1);
    expect(repository.addAttemptCount).toBe(2);
    expect(await repository.listSessions()).toHaveLength(1);
  });

  it("does not persist a stale compare when the selected sentence changes", async () => {
    const user = userEvent.setup();
    const repository = new SlowSessionRepository();
    render(<App repository={repository} />);

    await createPracticeText(user, "Cafe dialogue", "Bonjour. Salut.");
    await prepareRecording(user);

    await user.click(screen.getByRole("button", { name: "Compare" }));
    await repository.createSessionStarted;
    await user.click(screen.getByRole("button", { name: "Salut." }));
    repository.resolveCreateSession?.();
    await user.click(screen.getByRole("button", { name: "Sessions" }));

    expect(screen.getByText("No sessions yet.")).toBeInTheDocument();
    expect(repository.addAttemptCount).toBe(0);
  });

  it("updates the active navigation state when switching to Sessions", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Sessions" }));

    expect(screen.getByRole("button", { name: "Sessions" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Texts" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
