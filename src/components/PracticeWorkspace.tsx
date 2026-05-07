import type { PracticeSentence, TextDocument } from "../domain/types";
import { TransportBar } from "./TransportBar";
import { WaveformPair } from "./WaveformPair";

interface PracticeWorkspaceProps {
  text?: TextDocument;
  sentences: PracticeSentence[];
  selectedSentenceId?: string;
  hasReference: boolean;
  hasRecording: boolean;
  speed: number;
  onSpeedChange(speed: number): void;
  onSelectSentence(sentenceId: string): void;
  onPlayReference(): void;
  onRecord(): void;
  onCompare(): void;
}

export function PracticeWorkspace({
  text,
  sentences,
  selectedSentenceId,
  hasReference,
  hasRecording,
  speed,
  onSpeedChange,
  onSelectSentence,
  onPlayReference,
  onRecord,
  onCompare,
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
        </div>
        <div className="mode-toggle">
          <button className="button secondary" type="button" aria-pressed="false">
            Reader
          </button>
          <button className="button primary" type="button" aria-pressed="true">
            Lab
          </button>
        </div>
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
      <WaveformPair hasReference={hasReference} hasRecording={hasRecording} />
      <TransportBar
        speed={speed}
        onSpeedChange={onSpeedChange}
        onPlayReference={onPlayReference}
        onRecord={onRecord}
        onCompare={onCompare}
      />
    </section>
  );
}
