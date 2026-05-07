import { useMemo, useState } from "react";
import { PracticeWorkspace } from "./components/PracticeWorkspace";
import { TextImport } from "./components/TextImport";
import { InMemoryRepository } from "./data/inMemoryRepository";
import type { StudioRepository } from "./data/repository";
import type { PracticeSentence, TextDocument } from "./domain/types";

interface AppProps {
  repository?: StudioRepository;
}

export default function App({ repository }: AppProps) {
  const [defaultRepository] = useState(() => new InMemoryRepository());
  const activeRepository = repository ?? defaultRepository;
  const [texts, setTexts] = useState<TextDocument[]>([]);
  const [sentences, setSentences] = useState<PracticeSentence[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string>();
  const [selectedSentenceId, setSelectedSentenceId] = useState<string>();

  const selectedText = useMemo(
    () => texts.find((text) => text.id === selectedTextId),
    [selectedTextId, texts],
  );

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="App sidebar">
        <h1 className="app-title">French Pronunciation Studio</h1>
        <nav className="nav-stack" aria-label="Main navigation">
          <button
            className="nav-button active"
            type="button"
            aria-current="page"
          >
            Texts
          </button>
          <button className="nav-button" type="button">
            Sessions
          </button>
        </nav>
        <TextImport
          onCreate={async (input) => {
            const created = await activeRepository.createText(input);
            setTexts(await activeRepository.listTexts());
            setSentences(created.sentences);
            setSelectedTextId(created.text.id);
            setSelectedSentenceId(created.sentences[0]?.id);
          }}
        />
      </aside>
      <section className="workspace" aria-label="Practice workspace">
        <PracticeWorkspace
          text={selectedText}
          sentences={sentences}
          selectedSentenceId={selectedSentenceId}
          onSelectSentence={setSelectedSentenceId}
        />
      </section>
      <aside className="feedback-panel" aria-label="Feedback">
        <h2>Feedback</h2>
      </aside>
    </main>
  );
}
