import type { PracticeSentence, TextDocument } from "../domain/types";
import { TransportBar } from "./TransportBar";
import { WaveformPair } from "./WaveformPair";

interface PracticeWorkspaceProps {
  text?: TextDocument;
  sentences: PracticeSentence[];
  selectedSentenceId?: string;
  hasReference: boolean;
  hasRecording: boolean;
  isGeneratingReference: boolean;
  referenceAudioUrl?: string;
  referenceError?: string;
  speed: number;
  isLooping: boolean;
  canCompare: boolean;
  onSpeedChange(speed: number): void;
  onSelectSentence(sentenceId: string): void;
  onPlayReference(): void;
  onRecord(): void;
  onCompare(): void;
  onToggleLoop(): void;
}

export function PracticeWorkspace({
  text,
  sentences,
  selectedSentenceId,
  hasReference,
  hasRecording,
  isGeneratingReference,
  referenceAudioUrl,
  referenceError,
  speed,
  isLooping,
  canCompare,
  onSpeedChange,
  onSelectSentence,
  onPlayReference,
  onRecord,
  onCompare,
  onToggleLoop,
}: PracticeWorkspaceProps) {
  if (!text) {
    return (
      <section className="empty-state">
        <h2>Practice</h2>
        <p>Paste French text to create your first practice set.</p>
      </section>
    );
  }

  return (
    <section className="practice-layout">
      <div className="workspace-header">
        <div>
          <p className="eyebrow">Practice Text</p>
          <h2>{text.title}</h2>
          <p className="workspace-subtitle">
            Select one sentence, listen once, record, then compare.
          </p>
        </div>
        <p className="mode-indicator">Local Lab</p>
      </div>
      <div className="sentence-list">
        {sentences.map((sentence) => (
          <button
            className={
              sentence.id === selectedSentenceId
                ? "sentence-card active"
                : "sentence-card"
            }
            key={sentence.id}
            type="button"
            aria-pressed={sentence.id === selectedSentenceId}
            onClick={() => onSelectSentence(sentence.id)}
          >
            {sentence.text}
          </button>
        ))}
      </div>
      <WaveformPair
        hasReference={hasReference}
        hasRecording={hasRecording}
        isGeneratingReference={isGeneratingReference}
        referenceAudioUrl={referenceAudioUrl}
        referenceError={referenceError}
      />
      <TransportBar
        speed={speed}
        isLooping={isLooping}
        isGeneratingReference={isGeneratingReference}
        canCompare={canCompare}
        onSpeedChange={onSpeedChange}
        onPlayReference={onPlayReference}
        onRecord={onRecord}
        onCompare={onCompare}
        onToggleLoop={onToggleLoop}
      />
    </section>
  );
}
