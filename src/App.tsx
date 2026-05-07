import { useMemo, useRef, useState } from "react";
import { FeedbackPanel } from "./components/FeedbackPanel";
import { PracticeWorkspace } from "./components/PracticeWorkspace";
import { SessionList } from "./components/SessionList";
import { TextImport } from "./components/TextImport";
import { InMemoryRepository } from "./data/inMemoryRepository";
import type { StudioRepository } from "./data/repository";
import type {
  AnalysisResult,
  PracticeSession,
  PracticeSentence,
  TextDocument,
  VoiceSettings,
} from "./domain/types";
import {
  MockAnalyzerAdapter,
  MockAsrAdapter,
  MockTtsAdapter,
} from "./modelAdapters/mockAdapters";
import type {
  AnalyzerAdapter,
  AsrAdapter,
  TtsAdapter,
} from "./modelAdapters/types";

const defaultTtsAdapter = new MockTtsAdapter();
const defaultAsrAdapter = new MockAsrAdapter();
const defaultAnalyzerAdapter = new MockAnalyzerAdapter();

const defaultVoice: VoiceSettings = {
  engine: "mock",
  voiceId: "camille",
  speed: 0.9,
  styleStrength: 0.6,
};

interface AppProps {
  repository?: StudioRepository;
  ttsAdapter?: TtsAdapter;
  asrAdapter?: AsrAdapter;
  analyzerAdapter?: AnalyzerAdapter;
}

type Screen = "texts" | "sessions";

interface SessionCreation {
  textId: string;
  promise: Promise<string>;
}

export default function App({
  repository: providedRepository,
  ttsAdapter = defaultTtsAdapter,
  asrAdapter = defaultAsrAdapter,
  analyzerAdapter = defaultAnalyzerAdapter,
}: AppProps) {
  const [repository] = useState<StudioRepository>(
    () => providedRepository ?? new InMemoryRepository(),
  );
  const [screen, setScreen] = useState<Screen>("texts");
  const [texts, setTexts] = useState<TextDocument[]>([]);
  const [sentences, setSentences] = useState<PracticeSentence[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string>();
  const [selectedSentenceId, setSelectedSentenceId] = useState<string>();
  const [activeSessionId, setActiveSessionId] = useState<string>();
  const [hasReference, setHasReference] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [referenceDurationMs, setReferenceDurationMs] = useState(0);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisResult>();
  const [speed, setSpeed] = useState(0.9);
  const [isLooping, setIsLooping] = useState(false);
  const selectedSentenceIdRef = useRef<string | undefined>(undefined);
  const selectedTextIdRef = useRef<string | undefined>(undefined);
  const activeSessionIdRef = useRef<string | undefined>(undefined);
  const sessionCreationRef = useRef<SessionCreation | undefined>(undefined);

  const selectedText = useMemo(
    () => texts.find((text) => text.id === selectedTextId),
    [selectedTextId, texts],
  );
  const selectedSentence = useMemo(
    () => sentences.find((sentence) => sentence.id === selectedSentenceId),
    [selectedSentenceId, sentences],
  );

  async function playReference() {
    if (!selectedSentence) return;

    const sentenceId = selectedSentence.id;
    const generated = await ttsAdapter.generate({
      sentenceId,
      text: selectedSentence.text,
      voice: { ...defaultVoice, speed },
    });
    if (selectedSentenceIdRef.current !== sentenceId) return;

    setHasReference(true);
    setReferenceDurationMs(generated.durationMs);
  }

  async function record() {
    if (!selectedSentence) return;

    setHasRecording(true);
    setRecordingDurationMs(
      Math.max(900, selectedSentence.text.split(/\s+/).length * 480),
    );
  }

  async function compare() {
    if (!selectedSentence || !hasRecording) return;

    const sentenceId = selectedSentence.id;
    const textId = selectedSentence.textId;
    const isCurrentCompareRun = () =>
      selectedSentenceIdRef.current === sentenceId &&
      selectedTextIdRef.current === textId;

    if (!isCurrentCompareRun()) return;

    const transcription = await asrAdapter.transcribe({
      recordingPath: "mock://recording/bonjour.wav",
      fallbackText: selectedSentence.text,
    });
    if (!isCurrentCompareRun()) return;

    const result = await analyzerAdapter.analyze({
      expectedText: selectedSentence.text,
      recognizedText: transcription.text,
      referenceDurationMs: referenceDurationMs || 1000,
      recordingDurationMs: recordingDurationMs || transcription.durationMs,
    });
    if (!isCurrentCompareRun()) return;

    setAnalysis(result);

    const sessionId = await getOrCreateActiveSession(
      textId,
      isCurrentCompareRun,
    );
    if (!isCurrentCompareRun()) return;
    if (!sessionId) return;

    await repository.addAttempt({
      sessionId,
      sentenceId,
      recordingPath: "mock://recording/bonjour.wav",
      durationMs: recordingDurationMs || transcription.durationMs,
      recognizedText: transcription.text,
      analysis: result,
    });
    if (!isCurrentCompareRun()) return;

    setSessions(filterMeaningfulSessions(await repository.listSessions()));
  }

  async function getOrCreateActiveSession(
    textId: string,
    isCurrentCompareRun: () => boolean,
  ) {
    const existingSessionId = activeSessionIdRef.current ?? activeSessionId;
    if (existingSessionId) return existingSessionId;

    if (!isCurrentCompareRun()) return "";

    const pendingSessionCreation = sessionCreationRef.current;
    if (pendingSessionCreation?.textId === textId) {
      const sessionId = await pendingSessionCreation.promise;
      if (isCurrentCompareRun()) {
        activeSessionIdRef.current = sessionId;
        setActiveSessionId(sessionId);
        return sessionId;
      }
      return "";
    }

    const sessionCreationPromise = repository
      .createSession(textId)
      .then((session) => session.id)
      .finally(() => {
        if (sessionCreationRef.current?.promise === sessionCreationPromise) {
          sessionCreationRef.current = undefined;
        }
      });
    sessionCreationRef.current = {
      textId,
      promise: sessionCreationPromise,
    };

    const sessionId = await sessionCreationPromise;
    if (isCurrentCompareRun()) {
      activeSessionIdRef.current = sessionId;
      setActiveSessionId(sessionId);
      return sessionId;
    }

    return "";
  }

  function filterMeaningfulSessions(sessionList: PracticeSession[]) {
    return sessionList.filter((session) => session.attemptIds.length > 0);
  }

  function clearSentenceLabState() {
    setHasReference(false);
    setHasRecording(false);
    setReferenceDurationMs(0);
    setRecordingDurationMs(0);
    setAnalysis(undefined);
    setIsLooping(false);
  }

  function selectSentence(sentenceId: string) {
    if (sentenceId === selectedSentenceId) return;

    selectedSentenceIdRef.current = sentenceId;
    setSelectedSentenceId(sentenceId);
    clearSentenceLabState();
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="App sidebar">
        <h1 className="app-title">French Pronunciation Studio</h1>
        <nav className="nav-stack" aria-label="Main navigation">
          <button
            className={screen === "texts" ? "nav-button active" : "nav-button"}
            type="button"
            aria-current={screen === "texts" ? "page" : undefined}
            onClick={() => setScreen("texts")}
          >
            Texts
          </button>
          <button
            className={
              screen === "sessions" ? "nav-button active" : "nav-button"
            }
            type="button"
            aria-current={screen === "sessions" ? "page" : undefined}
            onClick={() => setScreen("sessions")}
          >
            Sessions
          </button>
        </nav>
        {screen === "texts" ? (
          <TextImport
            onCreate={async (input) => {
              const created = await repository.createText(input);
              setTexts(await repository.listTexts());
              setSentences(created.sentences);
              setSelectedTextId(created.text.id);
              selectedTextIdRef.current = created.text.id;
              selectedSentenceIdRef.current = created.sentences[0]?.id;
              setSelectedSentenceId(created.sentences[0]?.id);
              activeSessionIdRef.current = undefined;
              sessionCreationRef.current = undefined;
              setActiveSessionId(undefined);
              clearSentenceLabState();
              setSpeed(0.9);
            }}
          />
        ) : null}
      </aside>
      <section className="workspace" aria-label="Practice workspace">
        {screen === "texts" ? (
          <PracticeWorkspace
            text={selectedText}
            sentences={sentences}
            selectedSentenceId={selectedSentenceId}
            hasReference={hasReference}
            hasRecording={hasRecording}
            speed={speed}
            isLooping={isLooping}
            canCompare={hasRecording}
            onSpeedChange={setSpeed}
            onSelectSentence={selectSentence}
            onPlayReference={playReference}
            onRecord={record}
            onCompare={compare}
            onToggleLoop={() => setIsLooping((current) => !current)}
          />
        ) : (
          <SessionList sessions={sessions} texts={texts} />
        )}
      </section>
      <FeedbackPanel
        analysis={analysis}
        modelStatus="TTS and ASR are mocked locally in Phase 1."
      />
    </main>
  );
}
