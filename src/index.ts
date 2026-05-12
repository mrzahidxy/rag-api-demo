import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import askRouter from "./routes/ask";
import documentsRouter from "./routes/documents";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/api/documents", documentsRouter);
app.use("/api/ask", askRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);

  res.status(500).json({
    error: error.message || "Something went wrong."
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
