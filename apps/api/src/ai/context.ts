import { prisma } from "../lib/prisma";

// How much conversation history a draft sees. Older messages rarely change
// the reply, but they do grow the bill on long threads.
const RECENT_MESSAGES = 8;

// Everything the AI needs about one ticket, loaded in a single query.
export async function loadTicketContext(ticketId: string) {
  const ticket = await prisma.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    include: {
      book: true,
      author: {
        include: {
          user: { select: { name: true } },
          books: { select: { id: true, title: true, status: true, royaltyPending: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: RECENT_MESSAGES,
        include: { sender: { select: { name: true, role: true } } },
      },
    },
  });

  return { ...ticket, messages: ticket.messages.reverse() };
}

export type TicketContext = Awaited<ReturnType<typeof loadTicketContext>>;
