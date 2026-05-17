import type { PracticeSession, TextDocument } from "../domain/types";

interface SessionListProps {
  sessions: PracticeSession[];
  texts: TextDocument[];
  selectedSessionId?: string;
  onSelectSession(sessionId: string): void;
  onReorderSessions?(sourceSessionId: string, targetSessionId: string): void;
}

export function SessionList({
  sessions,
  texts,
  selectedSessionId,
  onSelectSession,
  onReorderSessions,
}: SessionListProps) {
  return (
    <section className="sessions-panel sidebar-sessions" aria-label="Passages">
      <div className="workspace-header">
        <div>
          <h2>Passages</h2>
        </div>
      </div>
      <div className="session-list">
        {sessions.length === 0 ? (
          <p className="muted">No passages yet.</p>
        ) : (
          sessions.map((session) => {
            const text = texts.find((item) => item.id === session.textId);
            const sentenceCount = text?.sentenceIds.length ?? 0;
            const sentenceLabel =
              sentenceCount === 1 ? "1 sentence" : `${sentenceCount} sentences`;
            return (
              <button
                className={
                  session.id === selectedSessionId
                    ? "session-card active"
                    : "session-card"
                }
                key={session.id}
                type="button"
                draggable={Boolean(onReorderSessions)}
                aria-label={`${text?.title ?? "Untitled text"}, ${sentenceLabel}`}
                aria-pressed={session.id === selectedSessionId}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", session.id);
                }}
                onDragOver={(event) => {
                  if (!onReorderSessions) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  if (!onReorderSessions) return;
                  event.preventDefault();
                  const sourceSessionId = event.dataTransfer.getData("text/plain");
                  if (sourceSessionId && sourceSessionId !== session.id) {
                    onReorderSessions(sourceSessionId, session.id);
                  }
                }}
                onClick={() => onSelectSession(session.id)}
              >
                <h3>{text?.title ?? "Untitled text"}</h3>
                <p>{sentenceLabel}</p>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
