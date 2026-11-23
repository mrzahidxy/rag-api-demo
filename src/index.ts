import "dotenv/config";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import askRouter from "./routes/ask";
import documentsRouter from "./routes/documents";
import { rateLimit, requireKey, requiredKey } from "./security";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const queryKey = requiredKey("API_KEY");
const adminKey = requiredKey("ADMIN_API_KEY");
if (queryKey === adminKey) throw new Error("API_KEY and ADMIN_API_KEY must be different.");
const allowedOrigins = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins?.length ? allowedOrigins : false }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/api/documents", requireKey(adminKey), rateLimit(20), documentsRouter);
app.use("/api/ask", requireKey(queryKey), rateLimit(60), askRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);

  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
