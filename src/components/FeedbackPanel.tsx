import type { AnalysisResult } from "../domain/types";

interface FeedbackPanelProps {
  analysis?: AnalysisResult;
  modelStatus: string;
}

export function FeedbackPanel({ analysis, modelStatus }: FeedbackPanelProps) {
  return (
    <aside className="feedback-panel" aria-label="Feedback">
      <h2>Feedback</h2>
      <section className="feedback-card">
        <p className="eyebrow">Basic Local Result</p>
        <p>{analysis?.needsRepeat ? "Repeat this sentence." : "No repeat needed."}</p>
      </section>
      <section className="feedback-card">
        <p className="eyebrow">Recognized Words</p>
        <div className="word-row">
          {analysis?.words.map((word, index) => (
            <span
              className={`word-token ${word.status}`}
              key={`${word.expected}-${index}`}
            >
              {word.expected}
            </span>
          )) ?? <span className="muted">Record to see local feedback.</span>}
        </div>
      </section>
      <section className="feedback-card">
        <p className="eyebrow">Model Status</p>
        <p>{modelStatus}</p>
      </section>
    </aside>
  );
}
