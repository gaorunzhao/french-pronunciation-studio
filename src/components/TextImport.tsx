import { useState } from "react";
import { Sparkles } from "lucide-react";

interface TextImportProps {
  onCreate(input: { title: string; body: string }): Promise<void> | void;
}

export function TextImport({ onCreate }: TextImportProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="text-import"
      aria-label="Import French text"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!title.trim() || !body.trim()) return;
        setIsPending(true);
        setError("");
        try {
          await onCreate({ title: title.trim(), body: body.trim() });
          setTitle("");
          setBody("");
        } catch {
          setError("Could not create text.");
        } finally {
          setIsPending(false);
        }
      }}
    >
      <div className="text-import-header">
        <div>
          <p className="eyebrow">New Practice Text</p>
          <h2>Paste French. Practice sentence by sentence.</h2>
        </div>
        <p className="composer-note">B2-ready local pronunciation lab</p>
      </div>
      <label className="text-import-title">
        <span>Text title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Text title"
          disabled={isPending}
        />
      </label>
      <label className="text-import-body">
        <span>French text</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          aria-label="French text"
          disabled={isPending}
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="button primary text-import-submit"
        type="submit"
        disabled={isPending}
      >
        <Sparkles aria-hidden="true" size={17} strokeWidth={2.2} />
        <span>Create practice text</span>
      </button>
    </form>
  );
}
