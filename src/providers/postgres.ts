import * as db from "../db";
import { DocumentListItem, RelevantChunk } from "../types";
import { DocumentStore } from "./contracts";

export const postgresStore: DocumentStore = {
  dimensions: 3072,
  async add(externalId, title, content, chunks) {
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      let id: number;
      if (externalId) {
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [externalId]);
        const existing = await client.query<{ id: number }>(
          "SELECT id FROM documents WHERE external_id = $1",
          [externalId]
        );
        if (existing.rows[0]) {
          id = existing.rows[0].id;
          await client.query("UPDATE documents SET title = $1, content = $2 WHERE id = $3", [title, content, id]);
          await client.query("DELETE FROM chunks WHERE document_id = $1", [id]);
        } else {
          const result = await client.query<{ id: number }>(
            "INSERT INTO documents (external_id, title, content) VALUES ($1, $2, $3) RETURNING id",
            [externalId, title, content]
          );
          id = result.rows[0].id;
        }
      } else {
        const result = await client.query<{ id: number }>(
          "INSERT INTO documents (external_id, title, content) VALUES ($1, $2, $3) RETURNING id",
          [null, title, content]
        );
        id = result.rows[0].id;
      }
      for (const chunk of chunks) {
        await client.query(
          "INSERT INTO chunks (document_id, content, embedding) VALUES ($1, $2, $3::vector)",
          [id, chunk.content, db.toVectorString(chunk.embedding)]
        );
      }
      await client.query("COMMIT");
      return id;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  async list(): Promise<DocumentListItem[]> {
    const result = await db.query<DocumentListItem>(
      "SELECT id, external_id, title, created_at FROM documents ORDER BY created_at DESC"
    );
    return result.rows;
  },
  async remove(id): Promise<boolean> {
    const result = await db.query("DELETE FROM documents WHERE id = $1", [id]);
    return Boolean(result.rowCount);
  },
  async search(embedding, limit): Promise<RelevantChunk[]> {
    const result = await db.query<RelevantChunk>(
      `SELECT chunks.document_id, chunks.content, chunks.embedding <=> $1::vector AS distance
       FROM chunks
       ORDER BY chunks.embedding <=> $1::vector LIMIT $2`,
      [db.toVectorString(embedding), limit]
    );
    return result.rows;
  }
};
