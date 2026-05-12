import express, { NextFunction, Request, Response } from "express";
import * as db from "../db";
import { generateQueryEmbedding } from "../services/embeddingService";
import { generateAnswer } from "../services/geminiService";
import { AskRequestBody, ChunkRow, RelevantChunk } from "../types";

const router = express.Router();
const FALLBACK_ANSWER = "I don't have enough information in the provided documents.";
const MAX_RELEVANT_DISTANCE = 0.35;

router.post(
  "/",
  async (
    req: Request<Record<string, never>, unknown, AskRequestBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const question = String(req.body.question || "").trim();

    if (!question) {
      res.status(400).json({ error: "Question is required." });
      return;
    }

    try {
      const questionEmbedding = await generateQueryEmbedding(question);

      const result = await db.query<ChunkRow>(
        `SELECT
        id,
        document_id,
        content,
        embedding <=> $1::vector AS distance
      FROM chunks
      ORDER BY embedding <=> $1::vector
      LIMIT 3`,
        [db.toVectorString(questionEmbedding)]
      );

      const chunks = result.rows;
      const relevantChunks: RelevantChunk[] = chunks.filter(
        (chunk: ChunkRow) => Number(chunk.distance) <= MAX_RELEVANT_DISTANCE
      );

      if (relevantChunks.length === 0) {
        res.json({
          answer: FALLBACK_ANSWER,
          sources: []
        });
        return;
      }

      // The model only sees the top matching chunks, not the full database.
      const answer = await generateAnswer(question, relevantChunks);

      res.json({
        answer: answer || FALLBACK_ANSWER,
        sources: relevantChunks.map((chunk) => ({
          documentId: chunk.document_id,
          content: chunk.content
        }))
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
