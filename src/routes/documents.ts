import express, { NextFunction, Request, Response } from "express";
import { chunkText } from "../services/chunkService";
import { embeddings, store } from "../providers";
import { DocumentRequestBody } from "../types";
import { normalizeExternalId } from "../externalId";

const router = express.Router();
const MAX_CONTENT_LENGTH = 20_000;
const MAX_CHUNKS = 40;

router.post(
  "/",
  async (
    req: Request<Record<string, never>, unknown, DocumentRequestBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const title = String(req.body?.title || "").trim();
    const content = String(req.body?.content || "").trim();
    const externalId = normalizeExternalId(req.body?.externalId);

    if (!title) {
      res.status(400).json({ error: "Title is required." });
      return;
    }

    if (!content) {
      res.status(400).json({ error: "Content is required." });
      return;
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      res.status(413).json({ error: `Content exceeds ${MAX_CONTENT_LENGTH} characters.` });
      return;
    }
    if (externalId === undefined) {
      res.status(400).json({ error: "externalId must be a string of 1–200 characters when supplied." });
      return;
    }

    try {
      const chunks = chunkText(content);
      if (chunks.length > MAX_CHUNKS) {
        res.status(413).json({ error: `Document exceeds ${MAX_CHUNKS} chunks.` });
        return;
      }
      const embedded = [];
      for (const chunk of chunks) {
        embedded.push({ content: chunk, embedding: await embeddings.embedDocument(chunk, title) });
      }
      const documentId = await store.add(externalId, title, content, embedded);

      res.status(201).json({
        message: "Document added successfully",
        documentId,
        chunksCreated: chunks.length
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await store.list());
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    res.status(400).json({ error: "Valid document ID is required." });
    return;
  }
  try {
    if (!await store.remove(id)) {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
