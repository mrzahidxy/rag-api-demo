import { AnswerProvider, DocumentStore, EmbeddingProvider } from "./contracts";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, generateDocumentEmbedding, generateQueryEmbedding } from "../services/embeddingService";
import { generateAnswer } from "../services/geminiService";
import { postgresStore } from "./postgres";

export const embeddings: EmbeddingProvider = {
  model: EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSIONS,
  embedDocument: generateDocumentEmbedding,
  embedQuery: generateQueryEmbedding
};
export const answers: AnswerProvider = { answer: generateAnswer };
export const store: DocumentStore = postgresStore;

if (!Number.isInteger(embeddings.dimensions) || embeddings.dimensions !== store.dimensions) {
  throw new Error(
    `Embedding dimensions (${embeddings.dimensions}) must match the store (${store.dimensions}). Re-embed documents when changing embedding models.`
  );
}
