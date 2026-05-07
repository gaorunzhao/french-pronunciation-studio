export default function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <h1 className="app-title">French Pronunciation Studio</h1>
        <nav className="nav-stack" aria-label="Main navigation">
          <button className="nav-button active" type="button">
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
      <aside className="feedback-panel">
        <h2>Feedback</h2>
      </aside>
    </main>
  );
}
