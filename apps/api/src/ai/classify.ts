import { z } from "zod";
import { TicketCategory, TicketPriority } from "../generated/prisma/client";
import type { TicketContext } from "./context";
import { classifyWithRules } from "./fallback";
import { runLlm } from "./llm";
import { CLASSIFICATION_SCHEMA, CLASSIFY_SYSTEM, buildClassifyPrompt } from "./prompts";

const resultSchema = z.object({
  category: z.enum(TicketCategory),
  priority: z.enum(TicketPriority),
  reason: z.string().trim().min(1).max(300),
});

export interface Classification extends z.infer<typeof resultSchema> {
  source: "ai" | "rules";
}

export async function classifyTicket(ctx: TicketContext): Promise<Classification> {
  try {
    const result = await runLlm(
      "classify",
      {
        system: CLASSIFY_SYSTEM,
        prompt: buildClassifyPrompt(ctx),
        maxTokens: 1024,
        effort: "low",
        jsonSchema: CLASSIFICATION_SCHEMA,
      },
      // Structured outputs should guarantee the shape, but we never trust it blindly.
      (text) => resultSchema.parse(JSON.parse(text)),
      ctx.id,
    );
    return { ...result, source: "ai" };
  } catch {
    // Already logged by runLlm; keyword rules keep the queue sorted.
    return { ...classifyWithRules(ctx.subject, ctx.description), source: "rules" };
  }
}
