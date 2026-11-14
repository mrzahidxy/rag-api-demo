import express, { NextFunction, Request, Response } from "express";
import { answers, embeddings, store } from "../providers";
import { AskRequestBody, RelevantChunk } from "../types";

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
    const question = String(req.body?.question || "").trim();

    if (!question) {
      res.status(400).json({ error: "Question is required." });
      return;
    }

    try {
      const questionEmbedding = await embeddings.embedQuery(question);
      const chunks = await store.search(questionEmbedding, 3);
      const relevantChunks: RelevantChunk[] = chunks.filter(
        (chunk) => Number(chunk.distance) <= MAX_RELEVANT_DISTANCE
      );

      if (relevantChunks.length === 0) {
        res.json({
          answer: FALLBACK_ANSWER,
          sources: []
        });
        return;
      }

      // The model only sees the top matching chunks, not the full database.
      const answer = await answers.answer(question, relevantChunks);

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
