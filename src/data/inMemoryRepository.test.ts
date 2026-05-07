import { InMemoryRepository } from "./inMemoryRepository";

describe("InMemoryRepository", () => {
  it("creates text documents with sentence records", async () => {
    const repository = new InMemoryRepository();

    const created = await repository.createText({
      title: "Cafe dialogue",
      body: "Bonjour. Je voudrais un cafe."
    });

    expect(created.text.title).toBe("Cafe dialogue");
    expect(created.sentences.map((sentence) => sentence.text)).toEqual([
      "Bonjour.",
      "Je voudrais un cafe."
    ]);
    expect(await repository.listTexts()).toHaveLength(1);
  });

  it("stores sessions and attempts", async () => {
    const repository = new InMemoryRepository();
    const created = await repository.createText({
      title: "Cafe dialogue",
      body: "Bonjour."
    });

    const session = await repository.createSession(created.text.id);
    const attempt = await repository.addAttempt({
      sessionId: session.id,
      sentenceId: created.sentences[0].id,
      recordingPath: "mock://recording.wav",
      durationMs: 900,
      recognizedText: "Bonjour",
      analysis: {
        words: [{ expected: "Bonjour", recognized: "Bonjour", status: "match" }],
        mismatchCount: 0,
        timingStatus: "similar",
        needsRepeat: false
      }
    });

    expect(attempt.sessionId).toBe(session.id);
    expect(await repository.listSessions()).toHaveLength(1);
  });
});
