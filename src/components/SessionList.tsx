import type { PracticeSession, TextDocument } from "../domain/types";

interface SessionListProps {
  sessions: PracticeSession[];
  texts: TextDocument[];
}

export function SessionList({ sessions, texts }: SessionListProps) {
  return (
    <section>
      <div className="workspace-header">
        <div>
          <p className="eyebrow">Sessions</p>
          <h2>Practice Sessions</h2>
        </div>
      </div>
      <div className="session-list">
        {sessions.length === 0 ? (
          <p className="muted">No sessions yet.</p>
        ) : (
          sessions.map((session) => {
            const text = texts.find((item) => item.id === session.textId);
            const attemptLabel =
              session.attemptIds.length === 1
                ? "1 attempt"
                : `${session.attemptIds.length} attempts`;
            return (
              <article className="session-card" key={session.id}>
                <h3>{text?.title ?? "Untitled text"}</h3>
                <p>{attemptLabel}</p>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
