import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing in your environment variables.");
}

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS || 3072);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

function normalizeVector(values: number[]): number[] {
  // Normalizing keeps vector comparisons more consistent for cosine search.
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));

  if (!magnitude) {
    return values;
  }

  return values.map((value) => value / magnitude);
}

function validateEmbeddingDimensions(values: number[]): void {
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, received ${values.length}.`
    );
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  const input = String(text || "").trim();

  if (!input) {
    throw new Error("Text is required to generate an embedding.");
  }

  const result = await embeddingModel.embedContent(input);
  const values = result.embedding.values;
  validateEmbeddingDimensions(values);

  return normalizeVector(values);
}

async function generateDocumentEmbedding(text: string, title = ""): Promise<number[]> {
  const input = String(text || "").trim();

  if (!input) {
    throw new Error("Text is required to generate an embedding.");
  }

  const result = await embeddingModel.embedContent({
    content: {
      role: "user",
      parts: [{ text: input }]
    },
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title: String(title || "").trim() || undefined
  });

  validateEmbeddingDimensions(result.embedding.values);

  return normalizeVector(result.embedding.values);
}

async function generateQueryEmbedding(text: string): Promise<number[]> {
  const input = String(text || "").trim();

  if (!input) {
    throw new Error("Text is required to generate an embedding.");
  }

  const result = await embeddingModel.embedContent({
    content: {
      role: "user",
      parts: [{ text: input }]
    },
    taskType: TaskType.RETRIEVAL_QUERY
  });

  validateEmbeddingDimensions(result.embedding.values);

  return normalizeVector(result.embedding.values);
}

export {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  generateEmbedding,
  generateDocumentEmbedding,
  generateQueryEmbedding
};
