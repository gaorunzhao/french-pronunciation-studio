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

  it("lists sentence records for a text in order", async () => {
    const repository = new InMemoryRepository();
    const created = await repository.createText({
      title: "Cafe dialogue",
      body: "Bonjour. Je voudrais un cafe. Merci."
    });

    const sentences = await repository.listSentences(created.text.id);

    expect(sentences.map((sentence) => sentence.index)).toEqual([0, 1, 2]);
    expect(sentences.map((sentence) => sentence.text)).toEqual([
      "Bonjour.",
      "Je voudrais un cafe.",
      "Merci."
    ]);
  });

  it("lists attempts for a sentence", async () => {
    const repository = new InMemoryRepository();
    const created = await repository.createText({
      title: "Cafe dialogue",
      body: "Bonjour. Merci."
    });
    const session = await repository.createSession(created.text.id);
    const firstAttempt = await repository.addAttempt({
      sessionId: session.id,
      sentenceId: created.sentences[0].id,
      recordingPath: "mock://bonjour.wav",
      durationMs: 900,
      recognizedText: "Bonjour",
      analysis: {
        words: [{ expected: "Bonjour", recognized: "Bonjour", status: "match" }],
        mismatchCount: 0,
        timingStatus: "similar",
        needsRepeat: false
      }
    });
    await repository.addAttempt({
      sessionId: session.id,
      sentenceId: created.sentences[1].id,
      recordingPath: "mock://merci.wav",
      durationMs: 700,
      recognizedText: "Merci",
      analysis: {
        words: [{ expected: "Merci", recognized: "Merci", status: "match" }],
        mismatchCount: 0,
        timingStatus: "similar",
        needsRepeat: false
      }
    });

    expect((await repository.listAttempts(created.sentences[0].id)).map((attempt) => attempt.id)).toEqual([
      firstAttempt.id
    ]);
  });

  it("updates session attempt ids after adding an attempt", async () => {
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

    expect((await repository.listSessions())[0].attemptIds).toEqual([attempt.id]);
  });

  it("does not expose mutable text sentence ids", async () => {
    const repository = new InMemoryRepository();
    const created = await repository.createText({
      title: "Cafe dialogue",
      body: "Bonjour."
    });

    created.text.sentenceIds.push("external-mutation");
    const [storedText] = await repository.listTexts();

    expect(storedText.sentenceIds).toEqual([created.sentences[0].id]);
  });

  it("does not expose mutable session attempt ids", async () => {
    const repository = new InMemoryRepository();
    const created = await repository.createText({
      title: "Cafe dialogue",
      body: "Bonjour."
    });
    const session = await repository.createSession(created.text.id);

    session.attemptIds.push("external-mutation");
    const [storedSession] = await repository.listSessions();

    expect(storedSession.attemptIds).toEqual([]);
  });

  it("does not expose mutable attempt analysis words", async () => {
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

    attempt.analysis.words.push({ expected: "!", recognized: "!", status: "match" });
    const [storedAttempt] = await repository.listAttempts(created.sentences[0].id);

    expect(storedAttempt.analysis.words).toEqual([
      { expected: "Bonjour", recognized: "Bonjour", status: "match" }
    ]);
  });

  it("rejects creating a session for a missing text", async () => {
    const repository = new InMemoryRepository();

    await expect(repository.createSession("missing")).rejects.toThrow("Text not found: missing");
  });

  it("rejects adding an attempt for a missing session", async () => {
    const repository = new InMemoryRepository();
    const created = await repository.createText({
      title: "Cafe dialogue",
      body: "Bonjour."
    });

    await expect(
      repository.addAttempt({
        sessionId: "missing",
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
      })
    ).rejects.toThrow("Session not found: missing");
  });

  it("rejects adding an attempt for a missing sentence", async () => {
    const repository = new InMemoryRepository();
    const created = await repository.createText({
      title: "Cafe dialogue",
      body: "Bonjour."
    });
    const session = await repository.createSession(created.text.id);

    await expect(
      repository.addAttempt({
        sessionId: session.id,
        sentenceId: "missing",
        recordingPath: "mock://recording.wav",
        durationMs: 900,
        recognizedText: "Bonjour",
        analysis: {
          words: [{ expected: "Bonjour", recognized: "Bonjour", status: "match" }],
          mismatchCount: 0,
          timingStatus: "similar",
          needsRepeat: false
        }
      })
    ).rejects.toThrow("Sentence not found: missing");
  });
});
