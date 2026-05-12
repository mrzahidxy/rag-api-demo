import { GoogleGenerativeAI } from "@google/generative-ai";
import { RelevantChunk } from "../types";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing in your environment variables.");
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const textModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });

async function generateAnswer(question: string, chunks: RelevantChunk[]): Promise<string> {
  const context = chunks.map((chunk) => chunk.content).join("\n\n");

  const prompt = `You are a helpful support assistant.
Answer the user question using only the context below.
If the answer is not found in the context, say:
"I don't have enough information in the provided documents."

Context:
${context || "No context provided."}

Question:
${question}

Return a clear short answer.`;

  const result = await textModel.generateContent(prompt);
  const response = await result.response;

  return response.text().trim();
}

export { GEMINI_MODEL, generateAnswer };
