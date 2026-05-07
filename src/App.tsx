import { useMemo, useState } from "react";
import { FeedbackPanel } from "./components/FeedbackPanel";
import { PracticeWorkspace } from "./components/PracticeWorkspace";
import { TextImport } from "./components/TextImport";
import { InMemoryRepository } from "./data/inMemoryRepository";
import type { StudioRepository } from "./data/repository";
import type {
  AnalysisResult,
  PracticeSentence,
  TextDocument,
  VoiceSettings,
} from "./domain/types";
import {
  MockAnalyzerAdapter,
  MockAsrAdapter,
  MockTtsAdapter,
} from "./modelAdapters/mockAdapters";

const ttsAdapter = new MockTtsAdapter();
const asrAdapter = new MockAsrAdapter();
const analyzerAdapter = new MockAnalyzerAdapter();

const defaultVoice: VoiceSettings = {
  engine: "mock",
  voiceId: "camille",
  speed: 0.9,
  styleStrength: 0.6,
};

interface AppProps {
  repository?: StudioRepository;
}

export default function App({ repository: providedRepository }: AppProps) {
  const [repository] = useState<StudioRepository>(
    () => providedRepository ?? new InMemoryRepository(),
  );
  const [texts, setTexts] = useState<TextDocument[]>([]);
  const [sentences, setSentences] = useState<PracticeSentence[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string>();
  const [selectedSentenceId, setSelectedSentenceId] = useState<string>();
  const [hasReference, setHasReference] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [referenceDurationMs, setReferenceDurationMs] = useState(0);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisResult>();
  const [speed, setSpeed] = useState(0.9);
  const [isLooping, setIsLooping] = useState(false);

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

    const generated = await ttsAdapter.generate({
      sentenceId: selectedSentence.id,
      text: selectedSentence.text,
      voice: { ...defaultVoice, speed },
    });
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
    if (!selectedSentence) return;

    const transcription = await asrAdapter.transcribe({
      recordingPath: "mock://recording/bonjour.wav",
      fallbackText: selectedSentence.text,
    });
    const result = await analyzerAdapter.analyze({
      expectedText: selectedSentence.text,
      recognizedText: transcription.text,
      referenceDurationMs: referenceDurationMs || 1000,
      recordingDurationMs: recordingDurationMs || transcription.durationMs,
    });
    setAnalysis(result);
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

    setSelectedSentenceId(sentenceId);
    clearSentenceLabState();
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="App sidebar">
        <h1 className="app-title">French Pronunciation Studio</h1>
        <nav className="nav-stack" aria-label="Main navigation">
          <button
            className="nav-button active"
            type="button"
            aria-current="page"
          >
            Texts
          </button>
          <button className="nav-button" type="button">
            Sessions
          </button>
        </nav>
        <TextImport
          onCreate={async (input) => {
            const created = await repository.createText(input);
            setTexts(await repository.listTexts());
            setSentences(created.sentences);
            setSelectedTextId(created.text.id);
            setSelectedSentenceId(created.sentences[0]?.id);
            clearSentenceLabState();
            setSpeed(0.9);
          }}
        />
      </aside>
      <section className="workspace" aria-label="Practice workspace">
        <PracticeWorkspace
          text={selectedText}
          sentences={sentences}
          selectedSentenceId={selectedSentenceId}
          hasReference={hasReference}
          hasRecording={hasRecording}
          speed={speed}
          isLooping={isLooping}
          onSpeedChange={setSpeed}
          onSelectSentence={selectSentence}
          onPlayReference={playReference}
          onRecord={record}
          onCompare={compare}
          onToggleLoop={() => setIsLooping((current) => !current)}
        />
      </section>
      <FeedbackPanel
        analysis={analysis}
        modelStatus="TTS and ASR are mocked locally in Phase 1."
      />
    </main>
  );
}
