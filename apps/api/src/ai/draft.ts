import type { DraftSource } from "../generated/prisma/client";
import type { TicketContext } from "./context";
import { buildTemplateDraft } from "./fallback";
import { runLlm } from "./llm";
import { DRAFT_SYSTEM, buildDraftPrompt } from "./prompts";

function checkDraft(text: string) {
  if (text.length < 40) throw new Error("Draft came back empty or too short.");
  return text;
}

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
      checkDraft,
      ctx.id,
    );
    return { text, source: "AI" };
  } catch {
    // Already logged by runLlm; a policy template still gives the admin a start.
    return { text: buildTemplateDraft(ctx), source: "TEMPLATE" };
  }
}
