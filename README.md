# Standalone RAG API MVP

An HTTP service that an existing application can use to answer questions from its own text documents. Deploy one service per app for the simplest setup. It ships with Gemini for embeddings and answers, and PostgreSQL with pgvector for storage. The HTTP routes use provider interfaces so other implementations can be added without changing the API.

## Setup

1. Install Node.js and a PostgreSQL database that permits the `vector` extension (Neon works). Keep the database URL server-side.
2. Run `npm ci` and copy `.env.example` to `.env`.
3. Set `DATABASE_URL`, `GEMINI_API_KEY`, and two different random keys in `.env`: `API_KEY` for questions and `ADMIN_API_KEY` for document management. Each key must be at least 32 bytes (for example, generate each with `openssl rand -hex 32`). Sample values are rejected at startup.
4. Run `src/sql/init.sql` against the database. If `DATABASE_URL` is exported in your shell, use `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/sql/init.sql`; a value in `.env` alone is not exported to the shell. The Neon SQL editor also works. The script is repeatable and adds `external_id` to the original schema when needed.
5. Run `npm run dev`, or `npm run build && npm start`.
6. Request `GET http://localhost:5000/health` and expect `{"status":"ok"}`.

Run `npm test` for the local build and document replacement check.

The database client verifies the server certificate. Use a valid TLS connection string and trusted CA; do not disable certificate verification to make a connection work. `EMBEDDING_DIMENSIONS` must match the schema's `vector(3072)`. Choose a Gemini answer model available to your account through `GEMINI_MODEL`.

Keep both API keys on your app's backend. `CORS_ORIGIN` is optional and accepts comma-separated trusted browser origins. Server-to-server calls do not need CORS. Use HTTPS when exposing the service beyond localhost.

## Connect an existing app

Call the service from your app's backend with `X-Api-Key`. Each deployment has one document collection. Use the admin key to manage documents and the query key to ask questions. Replace the sample keys below with your configured values; keep them out of browser code and source control.

```bash
curl -X POST http://localhost:5000/api/documents \
  -H 'Content-Type: application/json' \
  -H 'X-Api-Key: YOUR_ADMIN_API_KEY' \
  -d '{"externalId":"refund-policy","title":"Refund policy","content":"Refunds are available within seven days."}'

curl -X POST http://localhost:5000/api/ask \
  -H 'Content-Type: application/json' \
  -H 'X-Api-Key: YOUR_API_KEY' \
  -d '{"question":"When can I get a refund?"}'
```

`externalId` is optional. Reusing one atomically updates the document and replaces its chunks while preserving its numeric ID. Without it, each POST creates a new document. Text is limited to 20,000 characters and 40 chunks per request.

A successful document request returns HTTP 201 with `documentId` and `chunksCreated`. A successful question returns `answer` and `sources` (each source has a `documentId` and chunk `content`). Listing returns document IDs, external IDs, titles, and creation times. Delete returns HTTP 204, or 404 when the ID does not exist. Empty required fields return 400; oversized documents return 413. A missing or invalid key returns 401; too many requests return 429 with `Retry-After`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness check; no key required |
| POST | `/api/documents` | Add or replace text (`title`, `content`, optional `externalId`) |
| GET | `/api/documents` | List documents |
| DELETE | `/api/documents/:id` | Delete a document and its chunks |
| POST | `/api/ask` | Ask a question; returns `answer` and `sources` |

All `/api` routes require `X-Api-Key`. Document routes allow 20 requests per minute; question requests allow 60 per minute. These budgets are shared across callers in one server process and reset on restart. Use a shared rate-limit store if running multiple server instances. An answer without relevant chunks uses the fallback message and empty sources.

For a quick integration check after setup, add one short document with an `externalId`, send it again with changed content, and confirm the returned `documentId` stays the same. Then list documents and ask a question about the updated content. This uses the configured database and Gemini account, so `npm test` alone does not validate the full flow.

## Providers

The contracts are in `src/providers/contracts.ts`. `src/providers/index.ts` is the single place that wires the current Gemini and PostgreSQL implementations. To add a provider, implement the matching contract and replace its wiring there; the HTTP routes stay the same. Each deployment still serves one app and one document collection.

The SQL schema stores vectors with 3072 dimensions. Startup checks that the embedding provider and store agree on dimensions. A different embedding model, even with the same dimensions, requires re-embedding existing documents. A different dimension also requires a schema migration. Do not switch an existing collection by changing configuration alone.

## MVP limits

Text only. No user authentication, file parsing, or background ingestion. The keys identify the calling app, not its end users. Use a separate deployment for each app. Document ingestion calls Gemini synchronously; large imports should be split across requests.
