export default function App() {
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
      </aside>
      <section className="workspace" aria-label="Practice workspace">
        <h2>Practice</h2>
      </section>
      <aside className="feedback-panel" aria-label="Feedback">
        <h2>Feedback</h2>
      </aside>
    </main>
  );
}
