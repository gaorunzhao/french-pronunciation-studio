import { chunkFrenchText } from "../domain/sentenceChunker";
import type { Attempt, PracticeSentence, PracticeSession, TextDocument } from "../domain/types";
import type { AddAttemptInput, CreateTextInput, CreateTextResult, StudioRepository } from "./repository";

export class InMemoryRepository implements StudioRepository {
  private texts: TextDocument[] = [];
  private sentences: PracticeSentence[] = [];
  private sessions: PracticeSession[] = [];
  private attempts: Attempt[] = [];

  async createText(input: CreateTextInput): Promise<CreateTextResult> {
    const textId = createId("text");
    const sentenceBodies = chunkFrenchText(input.body);
    const sentences = sentenceBodies.map((body, index): PracticeSentence => ({
      id: createId("sentence"),
      textId,
      index,
      text: body,
      state: "new"
    }));
    const text: TextDocument = {
      id: textId,
      title: input.title,
      source: input.source,
      notes: input.notes,
      createdAt: new Date().toISOString(),
      sentenceIds: sentences.map((sentence) => sentence.id)
    };

    this.texts.push(text);
    this.sentences.push(...sentences);

    return { text, sentences };
  }

  async listTexts(): Promise<TextDocument[]> {
    return [...this.texts];
  }

  async listSentences(textId: string): Promise<PracticeSentence[]> {
    return this.sentences.filter((sentence) => sentence.textId === textId);
  }

  async createSession(textId: string): Promise<PracticeSession> {
    const session: PracticeSession = {
      id: createId("session"),
      textId,
      startedAt: new Date().toISOString(),
      attemptIds: []
    };
    this.sessions.push(session);
    return session;
  }

  async listSessions(): Promise<PracticeSession[]> {
    return [...this.sessions];
  }

  async addAttempt(input: AddAttemptInput): Promise<Attempt> {
    const attempt: Attempt = {
      id: createId("attempt"),
      sessionId: input.sessionId,
      sentenceId: input.sentenceId,
      recordingPath: input.recordingPath,
      durationMs: input.durationMs,
      recognizedText: input.recognizedText,
      analysis: input.analysis,
      createdAt: new Date().toISOString()
    };
    this.attempts.push(attempt);

    const session = this.sessions.find((item) => item.id === input.sessionId);
    session?.attemptIds.push(attempt.id);

    return attempt;
  }

  async listAttempts(sentenceId: string): Promise<Attempt[]> {
    return this.attempts.filter((attempt) => attempt.sentenceId === sentenceId);
  }
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
