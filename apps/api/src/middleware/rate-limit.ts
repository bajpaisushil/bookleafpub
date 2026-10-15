import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { env } from "../config/env";

// In-memory counters are per instance. With several instances behind a load
// balancer, plug in a shared store (e.g. rate-limit-redis).
const skip = () => env.NODE_ENV === "test";

const message = (text: string) => ({ error: { code: "RATE_LIMITED", message: text } });

// Signed-in routes are limited per user, everything else per IP.
const byUserOrIp = (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? "");

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip,
  message: message("Too many requests. Please slow down."),
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip,
  message: message("Too many login attempts. Please try again in a few minutes."),
});

export const createTicketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: byUserOrIp,
  skip,
  message: message("You've raised a lot of tickets in the last hour. Please wait before creating another."),
});

// Protects the LLM budget from runaway "regenerate" clicks or scripts.
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: byUserOrIp,
  skip,
  message: message("AI requests are rate limited. Please wait a moment and try again."),
});
