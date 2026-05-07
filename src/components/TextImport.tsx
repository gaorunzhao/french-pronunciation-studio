import { useState } from "react";

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
      <label>
        <span>Text title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Text title"
          disabled={isPending}
        />
      </label>
      <label>
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
      <button className="button primary" type="submit" disabled={isPending}>
        Create practice text
      </button>
    </form>
  );
}
