import { chunkFrenchText } from "../domain/sentenceChunker";
import type { AnalysisResult, Attempt, PracticeSentence, PracticeSession, TextDocument } from "../domain/types";
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

    return {
      text: cloneTextDocument(text),
      sentences: sentences.map(clonePracticeSentence)
    };
  }

  async listTexts(): Promise<TextDocument[]> {
    return this.texts.map(cloneTextDocument);
  }

  async listSentences(textId: string): Promise<PracticeSentence[]> {
    return this.sentences
      .filter((sentence) => sentence.textId === textId)
      .sort((left, right) => left.index - right.index)
      .map(clonePracticeSentence);
  }

  async createSession(textId: string): Promise<PracticeSession> {
    if (!this.texts.some((text) => text.id === textId)) {
      throw new Error(`Text not found: ${textId}`);
    }

    const session: PracticeSession = {
      id: createId("session"),
      textId,
      startedAt: new Date().toISOString(),
      attemptIds: []
    };
    this.sessions.push(session);
    return clonePracticeSession(session);
  }

  async listSessions(): Promise<PracticeSession[]> {
    return this.sessions.map(clonePracticeSession);
  }

  async addAttempt(input: AddAttemptInput): Promise<Attempt> {
    const session = this.sessions.find((item) => item.id === input.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${input.sessionId}`);
    }
    const sentence = this.sentences.find((item) => item.id === input.sentenceId);
    if (!sentence) {
      throw new Error(`Sentence not found: ${input.sentenceId}`);
    }
    if (sentence.textId !== session.textId) {
      throw new Error("Sentence does not belong to session text");
    }

    const attempt: Attempt = {
      id: createId("attempt"),
      sessionId: input.sessionId,
      sentenceId: input.sentenceId,
      recordingPath: input.recordingPath,
      durationMs: input.durationMs,
      recognizedText: input.recognizedText,
      analysis: cloneAnalysisResult(input.analysis),
      createdAt: new Date().toISOString()
    };
    this.attempts.push(attempt);

    session.attemptIds.push(attempt.id);

    return cloneAttempt(attempt);
  }

  async listAttempts(sentenceId: string): Promise<Attempt[]> {
    return this.attempts.filter((attempt) => attempt.sentenceId === sentenceId).map(cloneAttempt);
  }
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function cloneTextDocument(text: TextDocument): TextDocument {
  return {
    ...text,
    sentenceIds: [...text.sentenceIds]
  };
}

function clonePracticeSentence(sentence: PracticeSentence): PracticeSentence {
  return { ...sentence };
}

function clonePracticeSession(session: PracticeSession): PracticeSession {
  return {
    ...session,
    attemptIds: [...session.attemptIds]
  };
}

function cloneAttempt(attempt: Attempt): Attempt {
  return {
    ...attempt,
    analysis: cloneAnalysisResult(attempt.analysis)
  };
}

function cloneAnalysisResult(analysis: AnalysisResult): AnalysisResult {
  return {
    ...analysis,
    words: analysis.words.map((word) => ({ ...word }))
  };
}
