import { classifyTicket } from "../ai/classify";
import { loadTicketContext } from "../ai/context";
import { draftReply } from "../ai/draft";
import { notFound } from "../lib/errors";
import { CATEGORY_LABELS, PRIORITY_LABELS } from "../lib/labels";
import { prisma } from "../lib/prisma";
import { publish } from "../realtime/events";

/**
 * Classifies a ticket and stores the result. Safe to call more than once:
 * a category or priority an admin has overridden is never replaced.
 */
export async function classifyAndSave(ticketId: string, actorId?: string) {
  try {
    const ctx = await loadTicketContext(ticketId);
    const result = await classifyTicket(ctx);

    // "Overridden" = an admin set a value different from the AI's last suggestion.
    const categoryOverridden = ctx.category !== null && ctx.category !== ctx.aiCategory;
    const priorityOverridden = ctx.priority !== null && ctx.priority !== ctx.aiPriority;

    const summary = `${CATEGORY_LABELS[result.category]} · ${PRIORITY_LABELS[result.priority]}`;
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        category: categoryOverridden ? ctx.category : result.category,
        priority: priorityOverridden ? ctx.priority : result.priority,
        aiCategory: result.category,
        aiPriority: result.priority,
        aiReason: result.reason,
        aiStatus: result.source === "ai" ? "COMPLETED" : "FALLBACK",
        events: {
          create: {
            actorId,
            message:
              result.source === "ai"
                ? `AI classified as ${summary}`
                : `AI unavailable; classified by keyword rules as ${summary}`,
          },
        },
      },
    });

    publish({ type: "ticket.updated", ticketId, authorId: ctx.authorId });
  } catch (error) {
    // Leaves the ticket PENDING; the sweeper below will try again.
    console.error(`Failed to classify ticket ${ticketId}`, error);
  }
}

// If the process restarts mid-classification, tickets would be stuck as
// PENDING. A small periodic sweep picks them up again.
export async function classifyPendingTickets() {
  const pending = await prisma.ticket.findMany({
    where: { aiStatus: "PENDING", createdAt: { lt: new Date(Date.now() - 30_000) } },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { id: true },
  });
  for (const ticket of pending) await classifyAndSave(ticket.id);
  return pending.length;
}

export function startClassificationSweeper(intervalMs = 60_000) {
  const run = () => classifyPendingTickets().catch((error) => console.error("Classification sweep failed", error));
  void run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

type DraftResult = { draft: string; source: "AI" | "TEMPLATE"; generatedAt: Date | null };

// If two admins open the same ticket at the same moment, they share one LLM call.
const inFlight = new Map<string, Promise<DraftResult>>();

/**
 * Drafts are generated lazily (only for tickets an admin actually opens),
 * stored on the ticket and reused until something changes or the admin asks
 * for a new one. That's the main lever on AI spend.
 */
export async function getOrCreateDraft(ticketId: string, regenerate: boolean): Promise<DraftResult> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { aiDraft: true, aiDraftSource: true, aiDraftAt: true },
  });
  if (!ticket) throw notFound("Ticket");

  if (ticket.aiDraft && ticket.aiDraftSource && !regenerate) {
    return { draft: ticket.aiDraft, source: ticket.aiDraftSource, generatedAt: ticket.aiDraftAt };
  }

  let pending = inFlight.get(ticketId);
  if (!pending) {
    pending = generateDraft(ticketId).finally(() => inFlight.delete(ticketId));
    inFlight.set(ticketId, pending);
  }
  return pending;
}

async function generateDraft(ticketId: string): Promise<DraftResult> {
  const ctx = await loadTicketContext(ticketId);
  const { text, source } = await draftReply(ctx);

  const saved = await prisma.ticket.update({
    where: { id: ticketId },
    data: { aiDraft: text, aiDraftSource: source, aiDraftAt: new Date() },
    select: { aiDraftAt: true },
  });

  return { draft: text, source, generatedAt: saved.aiDraftAt };
}
