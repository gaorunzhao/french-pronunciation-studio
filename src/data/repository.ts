import type { AnalysisResult, Attempt, PracticeSentence, PracticeSession, TextDocument } from "../domain/types";

export interface CreateTextInput {
  title: string;
  body: string;
  source?: string;
  notes?: string;
}

export interface CreateTextResult {
  text: TextDocument;
  sentences: PracticeSentence[];
}

export interface UpdateTextInput {
  textId: string;
  title: string;
  body: string;
  source?: string;
  notes?: string;
}

export interface AddAttemptInput {
  sessionId: string;
  sentenceId: string;
  recordingPath: string;
  durationMs: number;
  recognizedText: string;
  analysis: AnalysisResult;
}

export interface StudioRepository {
  createText(input: CreateTextInput): Promise<CreateTextResult>;
  updateText(input: UpdateTextInput): Promise<CreateTextResult>;
  deleteText(textId: string): Promise<void>;
  listTexts(): Promise<TextDocument[]>;
  listSentences(textId: string): Promise<PracticeSentence[]>;
  createSession(textId: string): Promise<PracticeSession>;
  listSessions(): Promise<PracticeSession[]>;
  addAttempt(input: AddAttemptInput): Promise<Attempt>;
  listAttempts(sentenceId: string): Promise<Attempt[]>;
}
