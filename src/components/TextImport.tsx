import { useState } from "react";

interface TextImportProps {
  onCreate(input: { title: string; body: string }): void;
}

export function TextImport({ onCreate }: TextImportProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <form
      className="text-import"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim() || !body.trim()) return;
        onCreate({ title: title.trim(), body: body.trim() });
        setTitle("");
        setBody("");
      }}
    >
      <label>
        <span>Text title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Text title"
        />
      </label>
      <label>
        <span>French text</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          aria-label="French text"
        />
      </label>
      <button className="button primary" type="submit">
        Create practice text
      </button>
    </form>
  );
}
