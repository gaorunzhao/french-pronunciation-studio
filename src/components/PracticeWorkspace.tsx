import type { PracticeSentence, TextDocument } from "../domain/types";

interface PracticeWorkspaceProps {
  text?: TextDocument;
  sentences: PracticeSentence[];
  selectedSentenceId?: string;
  onSelectSentence(sentenceId: string): void;
}

export function PracticeWorkspace({
  text,
  sentences,
  selectedSentenceId,
  onSelectSentence,
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
    <section>
      <div className="workspace-header">
        <div>
          <p className="eyebrow">Practice Text</p>
          <h2>{text.title}</h2>
        </div>
        <div className="mode-toggle">
          <button className="button secondary" type="button">
            Reader
          </button>
          <button className="button secondary" type="button">
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
    </section>
  );
}
