import type { DraftSource } from "../generated/prisma/client";
import type { TicketContext } from "./context";
import { buildTemplateDraft } from "./fallback";
import { AiUnavailableError, runLlm } from "./llm";
import { DRAFT_SYSTEM, buildDraftPrompt } from "./prompts";

export async function draftReply(ctx: TicketContext): Promise<{ text: string; source: DraftSource }> {
  try {
    const text = await runLlm(
      "draft",
      {
        system: DRAFT_SYSTEM,
        prompt: buildDraftPrompt(ctx),
        maxTokens: 2048,
        effort: "medium",
      },
      ctx.id,
    );
    if (text.length < 40) throw new Error("Draft came back empty or too short.");
    return { text, source: "AI" };
  } catch (error) {
    if (!(error instanceof AiUnavailableError)) {
      console.warn(`Ticket ${ctx.id}: unusable AI draft, falling back to template`, error);
    }
    return { text: buildTemplateDraft(ctx), source: "TEMPLATE" };
  }
}
