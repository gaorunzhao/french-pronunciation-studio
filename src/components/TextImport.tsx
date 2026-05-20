import { useState } from "react";

interface TextImportProps {
  onCreate(input: { title: string; body: string }): Promise<void> | void;
}

const contentPlaceholder =
  "Collez un article, un dialogue ou une leçon en français. Séparez les phrases avec un point, un point d'interrogation ou un point d'exclamation.";

export function TextImport({ onCreate }: TextImportProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const sentenceCount = countSentences(body);
  const canSubmit = Boolean(body.trim()) && !isPending;

  return (
    <form
      className="text-import"
      aria-label="New passage"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!body.trim()) return;
        setIsPending(true);
        setError("");
        try {
          await onCreate({ title: title.trim(), body: body.trim() });
          setTitle("");
          setBody("");
        } catch {
          setError("Could not create passage.");
        } finally {
          setIsPending(false);
        }
      }}
    >
      <div
        className="text-import-composer"
        role="group"
        aria-label="Passage composer"
      >
        <label className="text-import-title">
          <span>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Title"
            placeholder="Optional"
            disabled={isPending}
          />
        </label>
        <label className="text-import-body">
          <span>Content</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            aria-label="Content"
            placeholder={contentPlaceholder}
            disabled={isPending}
          />
        </label>
      </div>
      <div className="text-import-footer">
        <span className="text-import-count" aria-live="polite">
          {sentenceCount} {sentenceCount === 1 ? "line" : "lines"}
        </span>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="button primary text-import-submit"
          type="submit"
          disabled={!canSubmit}
        >
          <span>{isPending ? "Starting practice" : "Start practice"}</span>
        </button>
      </div>
    </form>
  );
}

function countSentences(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed
    .split(/(?<=[.!?…])\s+|\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean).length;
}
