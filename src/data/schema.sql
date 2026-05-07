CREATE TABLE IF NOT EXISTS texts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sentences (
  id TEXT PRIMARY KEY,
  text_id TEXT NOT NULL REFERENCES texts(id) ON DELETE CASCADE,
  sentence_index INTEGER NOT NULL,
  body TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('new', 'practiced', 'needs-repeat', 'stable')),
  UNIQUE(text_id, sentence_index)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  text_id TEXT NOT NULL REFERENCES texts(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT
);

-- SQLite repository implementations must pre-validate that session.text_id
-- matches sentence.text_id before inserting an attempt.
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sentence_id TEXT NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  recording_path TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  recognized_text TEXT NOT NULL,
  analysis_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tts_cache (
  id TEXT PRIMARY KEY,
  sentence_id TEXT NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL UNIQUE,
  audio_path TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS model_settings (
  id TEXT PRIMARY KEY,
  active_tts_engine TEXT NOT NULL,
  active_voice_id TEXT NOT NULL,
  speed REAL NOT NULL,
  style_strength REAL NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sentences_text_id ON sentences(text_id);

CREATE INDEX IF NOT EXISTS idx_sessions_text_id ON sessions(text_id);

CREATE INDEX IF NOT EXISTS idx_attempts_session_id ON attempts(session_id);

CREATE INDEX IF NOT EXISTS idx_attempts_sentence_id ON attempts(sentence_id);
