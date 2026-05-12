import express, { NextFunction, Request, Response } from "express";
import { PoolClient } from "pg";
import * as db from "../db";
import { chunkText } from "../services/chunkService";
import { generateDocumentEmbedding } from "../services/embeddingService";
import { DocumentInsertRow, DocumentListItem, DocumentRequestBody } from "../types";

const router = express.Router();

router.post(
  "/",
  async (
    req: Request<Record<string, never>, unknown, DocumentRequestBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();

    if (!title) {
      res.status(400).json({ error: "Title is required." });
      return;
    }

    if (!content) {
      res.status(400).json({ error: "Content is required." });
      return;
    }

    let client: PoolClient | undefined;
    let transactionStarted = false;

    try {
      client = await db.pool.connect();
      await client.query("BEGIN");
      transactionStarted = true;

      const documentResult = await client.query<DocumentInsertRow>(
        "INSERT INTO documents (title, content) VALUES ($1, $2) RETURNING id",
        [title, content]
      );

      const documentId = documentResult.rows[0].id;
      const chunks = chunkText(content);

      for (const chunk of chunks) {
        // Each chunk gets its own embedding so we can search smaller pieces later.
        const embedding = await generateDocumentEmbedding(chunk, title);

        await client.query(
          "INSERT INTO chunks (document_id, content, embedding) VALUES ($1, $2, $3::vector)",
          [documentId, chunk, db.toVectorString(embedding)]
        );
      }

      await client.query("COMMIT");

      res.status(201).json({
        message: "Document added successfully",
        documentId,
        chunksCreated: chunks.length
      });
    } catch (error) {
      if (client && transactionStarted) {
        await client.query("ROLLBACK");
      }

      next(error);
    } finally {
      client?.release();
    }
  }
);

router.get("/", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await db.query<DocumentListItem>(
      "SELECT id, title, created_at FROM documents ORDER BY created_at DESC"
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;
