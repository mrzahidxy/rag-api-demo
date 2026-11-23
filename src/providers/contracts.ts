import { DocumentListItem, RelevantChunk } from "../types";

export interface EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;
  embedDocument(text: string, title: string): Promise<number[]>;
  embedQuery(text: string): Promise<number[]>;
}

export interface AnswerProvider {
  answer(question: string, chunks: RelevantChunk[]): Promise<string>;
}

export interface DocumentStore {
  readonly dimensions: number;
  add(externalId: string | null, title: string, content: string, chunks: { content: string; embedding: number[] }[]): Promise<number>;
  list(): Promise<DocumentListItem[]>;
  remove(id: number): Promise<boolean>;
  search(embedding: number[], limit: number): Promise<RelevantChunk[]>;
}
