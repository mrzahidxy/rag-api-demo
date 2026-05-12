# Simple RAG API

Minimal Express + TypeScript API for storing text documents, embedding their chunks with Gemini, saving them in Neon PostgreSQL, and answering questions from retrieved context only.

## Stack

- Node.js
- TypeScript
- Express
- Neon PostgreSQL
- `pgvector`
- Google Gemini

## How it works

1. `POST /api/documents` stores a document in `documents`.
2. The document content is split into paragraph-based chunks of about 500 characters.
3. Each chunk is embedded with `gemini-embedding-001` using the Gemini retrieval-document task type.
4. Chunks and embeddings are stored in `chunks`.
5. `POST /api/ask` embeds the question with the Gemini retrieval-query task type.
6. The API retrieves the 3 nearest chunks with pgvector cosine distance.
7. Only chunks with distance `<= 0.35` are passed to Gemini for the final answer.
8. If no chunk passes that threshold, the API returns:
   `I don't have enough information in the provided documents.`

## Project structure

```text
src/
  index.ts
  db.ts
  routes/
    documents.ts
    ask.ts
  services/
    chunkService.ts
    embeddingService.ts
    geminiService.ts
  sql/
    init.sql
requests.http
```

## Environment

Create `.env` in the project root:

```env
PORT=5000
DATABASE_URL=your_neon_postgresql_connection_string
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMENSIONS=3072
```

Notes:

- `DATABASE_URL` must be a valid `postgres://` or `postgresql://` Neon connection string.
- SSL is enabled in the Postgres client config.
- `EMBEDDING_DIMENSIONS` must match `vector(3072)` in [src/sql/init.sql](/C:/Users/Lenovo/Desktop/Personal/ai-app/simple-rag-api/src/sql/init.sql:1).

## Database setup

Run the SQL in [src/sql/init.sql](/C:/Users/Lenovo/Desktop/Personal/ai-app/simple-rag-api/src/sql/init.sql:1):

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(3072),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Run locally

```bash
npm install
npm run dev
```

Build and run compiled output:

```bash
npm run build
npm start
```

Default server URL:

```text
http://localhost:5000
```

## API

### `GET /health`

Response:

```json
{
  "status": "ok"
}
```

### `POST /api/documents`

Request:

```json
{
  "title": "Refund Policy",
  "content": "Users can request a refund within 7 days."
}
```

Response:

```json
{
  "message": "Document added successfully",
  "documentId": 1,
  "chunksCreated": 1
}
```

### `GET /api/documents`

Response:

```json
[
  {
    "id": 1,
    "title": "Refund Policy",
    "created_at": "2026-05-11T10:00:00.000Z"
  }
]
```

### `POST /api/ask`

Request:

```json
{
  "question": "Can I get a refund?"
}
```

Response:

```json
{
  "answer": "Yes, users can request a refund within 7 days.",
  "sources": [
    {
      "documentId": 1,
      "content": "Users can request a refund within 7 days."
    }
  ]
}
```

## Limits

- Text input only. There is no file upload flow.
- No authentication.
- Chunking is simple paragraph splitting with a 500-character fallback split.
- Answers are grounded only in retrieved chunks, not the full database.
