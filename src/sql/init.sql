CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  external_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS documents_external_id_idx ON documents (external_id);

CREATE TABLE IF NOT EXISTS chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(3072),
  created_at TIMESTAMP DEFAULT NOW()
);
