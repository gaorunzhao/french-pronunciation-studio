import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Popover from "@radix-ui/react-popover";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { PracticeSession, TextDocument } from "../domain/types";

interface SessionListProps {
  sessions: PracticeSession[];
  texts: TextDocument[];
  selectedSessionId?: string;
  onSelectSession(sessionId: string): void;
  onReorderSessions?(sourceSessionId: string, targetSessionId: string): void;
  onEditSession?(sessionId: string): void;
  onDeleteSession?(sessionId: string): void;
}

export function SessionList({
  sessions,
  texts,
  selectedSessionId,
  onSelectSession,
  onReorderSessions,
  onEditSession,
  onDeleteSession,
}: SessionListProps) {
  return (
    <section className="sessions-panel sidebar-sessions" aria-label="Passages">
      <div className="workspace-header">
        <div>
          <h2>Passages</h2>
        </div>
      </div>
      <ScrollArea.Root className="session-scroll" type="auto">
        <ScrollArea.Viewport className="session-scroll-viewport">
          <ToggleGroup.Root
            className="session-list"
            type="multiple"
            value={selectedSessionId ? [selectedSessionId] : []}
            onValueChange={(values) => {
              const nextValue = values.find((value) => value !== selectedSessionId);
              if (nextValue) onSelectSession(nextValue);
            }}
          >
            {sessions.length === 0 ? (
              <p className="muted">No passages yet.</p>
            ) : (
              sessions.map((session) => {
                const text = texts.find((item) => item.id === session.textId);
                const sentenceCount = text?.sentenceIds.length ?? 0;
                const sentenceLabel =
                  sentenceCount === 1 ? "1 sentence" : `${sentenceCount} sentences`;
                const title = text?.title ?? "Untitled text";
                return (
                  <div
                    className="session-row"
                    key={session.id}
                    draggable={Boolean(onReorderSessions)}
                    aria-label={`${text?.title ?? "Untitled text"}, ${sentenceLabel}`}
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
                  >
                    <ToggleGroup.Item
                      className="session-card"
                      value={session.id}
                      type="button"
                      aria-label={`${title}, ${sentenceLabel}`}
                    >
                      <h3>{title}</h3>
                      <p>{sentenceLabel}</p>
                    </ToggleGroup.Item>
                    <div className="session-actions" aria-label={`${title} actions`}>
                      <Popover.Root>
                        <Popover.Trigger asChild>
                          <button
                            className="session-menu-trigger"
                            type="button"
                            aria-label={`More options for ${title}`}
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <MoreVertical aria-hidden="true" size={16} strokeWidth={2.2} />
                          </button>
                        </Popover.Trigger>
                        <Popover.Portal>
                          <Popover.Content
                            className="session-menu-content"
                            align="end"
                            sideOffset={6}
                            role="menu"
                          >
                            <button
                              className="session-menu-item"
                              type="button"
                              role="menuitem"
                              onClick={() => onEditSession?.(session.id)}
                            >
                              <Pencil aria-hidden="true" size={14} strokeWidth={2.2} />
                              <span>Edit</span>
                            </button>
                            <button
                              className="session-menu-item danger"
                              type="button"
                              role="menuitem"
                              onClick={() => onDeleteSession?.(session.id)}
                            >
                              <Trash2 aria-hidden="true" size={14} strokeWidth={2.2} />
                              <span>Delete</span>
                            </button>
                          </Popover.Content>
                        </Popover.Portal>
                      </Popover.Root>
                    </div>
                  </div>
                );
              })
            )}
          </ToggleGroup.Root>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="scrollbar" orientation="vertical">
          <ScrollArea.Thumb className="scrollbar-thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </section>
  );
}
