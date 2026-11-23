import { timingSafeEqual } from "node:crypto";
import { NextFunction, Request, Response } from "express";

export function requiredKey(name: string): string {
  const value = process.env[name];
  if (!value || Buffer.byteLength(value) < 32 || value.startsWith("replace_with_")) {
    throw new Error(`${name} must be a unique secret of at least 32 bytes.`);
  }
  return value;
}

export function requireKey(expected: string) {
  const expectedBytes = Buffer.from(expected);
  return (req: Request, res: Response, next: NextFunction): void => {
    const supplied = Buffer.from(req.get("x-api-key") || "");
    if (supplied.length !== expectedBytes.length || !timingSafeEqual(supplied, expectedBytes)) {
      res.status(401).json({ error: "Invalid API key." });
      return;
    }
    next();
  };
}

// A single-process budget for the one-app deployment. Use a shared store when scaling out.
export function rateLimit(maxRequests: number) {
  let count = 0;
  let windowEnds = Date.now() + 60_000;
  return (_req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (now >= windowEnds) {
      count = 0;
      windowEnds = now + 60_000;
    }
    if (count >= maxRequests) {
      res.setHeader("Retry-After", Math.max(1, Math.ceil((windowEnds - now) / 1000)));
      res.status(429).json({ error: "Rate limit exceeded." });
      return;
    }
    count += 1;
    next();
  };
}
