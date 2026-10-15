import { Prisma, type TicketStatus } from "../generated/prisma/client";
import type { AuthUser } from "../lib/auth";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors";
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "../lib/labels";
import { prisma } from "../lib/prisma";
import { publish } from "../realtime/events";
import type { CreateMessageInput, CreateTicketInput, ListTicketsQuery, UpdateTicketInput } from "../validation";
import { classifyAndSave } from "./ai.service";

const UNRESOLVED: TicketStatus[] = ["OPEN", "IN_PROGRESS"];
const DAY_MS = 24 * 60 * 60 * 1000;

// Authors can only reach their own tickets. A ticket that belongs to someone
// else looks exactly like one that doesn't exist (404), so ids can't be probed.
function ownership(user: AuthUser): Prisma.TicketWhereInput {
  return user.role === "AUTHOR" ? { authorId: user.authorId ?? "" } : {};
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

const ORDER_BY: Record<ListTicketsQuery["sort"], Prisma.TicketOrderByWithRelationInput[]> = {
  // Critical first, then the oldest within each priority. Unclassified
  // tickets (null priority) are only seconds old, so they surface on top too.
  urgency: [{ priority: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
  newest: [{ createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
  updated: [{ updatedAt: "desc" }],
};

const listInclude = {
  book: { select: { id: true, title: true } },
  author: { select: { id: true, user: { select: { name: true } } } },
  assignee: { select: { id: true, name: true } },
  // Latest public message, to show who spoke last.
  messages: {
    where: { isInternal: false },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { createdAt: true, sender: { select: { role: true } } },
  },
  _count: { select: { messages: { where: { isInternal: false } } } },
} satisfies Prisma.TicketInclude;

type ListRow = Prisma.TicketGetPayload<{ include: typeof listInclude }>;

function toListItem(ticket: ListRow, user: AuthUser) {
  const last = ticket.messages[0];
  const item = {
    id: ticket.id,
    number: ticket.number,
    subject: ticket.subject,
    status: ticket.status,
    category: ticket.category,
    book: ticket.book,
    replyCount: ticket._count.messages,
    lastMessageAt: last?.createdAt ?? null,
    lastMessageFrom: last ? (last.sender.role === "ADMIN" ? "SUPPORT" : "AUTHOR") : null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };

  if (user.role === "AUTHOR") return item;

  return {
    ...item,
    priority: ticket.priority,
    aiStatus: ticket.aiStatus,
    aiCategory: ticket.aiCategory,
    aiPriority: ticket.aiPriority,
    author: { id: ticket.author.id, name: ticket.author.user.name },
    assignee: ticket.assignee,
    needsReply: UNRESOLVED.includes(ticket.status) && (!last || last.sender.role === "AUTHOR"),
  };
}

export async function listTickets(user: AuthUser, query: ListTicketsQuery) {
  const where: Prisma.TicketWhereInput = { ...ownership(user) };

  if (query.status?.length) where.status = { in: query.status };
  if (query.category) where.category = query.category;
  if (query.priority) where.priority = query.priority;
  if (query.assignee === "me") where.assigneeId = user.id;
  if (query.assignee === "unassigned") where.assigneeId = null;
  if (query.from || query.to) {
    // `to` is inclusive of the whole day.
    where.createdAt = { gte: query.from, lt: query.to ? new Date(query.to.getTime() + DAY_MS) : undefined };
  }
  if (query.q) {
    const number = Number(query.q.replace(/^#/, ""));
    where.OR = [
      { subject: { contains: query.q, mode: "insensitive" } },
      { book: { title: { contains: query.q, mode: "insensitive" } } },
      { author: { user: { name: { contains: query.q, mode: "insensitive" } } } },
      ...(Number.isInteger(number) && number > 0 ? [{ number }] : []),
    ];
  }

  const [total, tickets] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      include: listInclude,
      orderBy: ORDER_BY[query.sort],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    tickets: tickets.map((ticket) => toListItem(ticket, user)),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

export async function getTicket(user: AuthUser, id: string) {
  const isAdmin = user.role === "ADMIN";

  const ticket = await prisma.ticket.findFirst({
    where: { id, ...ownership(user) },
    include: {
      book: true,
      author: {
        include: {
          user: { select: { name: true, email: true } },
          books: { select: { id: true, title: true, status: true, royaltyPending: true } },
        },
      },
      assignee: { select: { id: true, name: true } },
      messages: {
        where: isAdmin ? undefined : { isInternal: false },
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, name: true, role: true } } },
      },
      events: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { actor: { select: { name: true } } },
      },
    },
  });
  if (!ticket) throw notFound("Ticket");

  const messages = ticket.messages.map((message) => ({
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    sender: message.sender,
    ...(isAdmin && { isInternal: message.isInternal, usedAiDraft: message.usedAiDraft }),
  }));

  const base = {
    id: ticket.id,
    number: ticket.number,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    category: ticket.category,
    attachmentName: ticket.attachmentName,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    resolvedAt: ticket.resolvedAt,
    messages,
  };

  if (!isAdmin) {
    return {
      ...base,
      book: ticket.book && {
        id: ticket.book.id,
        title: ticket.book.title,
        isbn: ticket.book.isbn,
        status: ticket.book.status,
      },
    };
  }

  return {
    ...base,
    priority: ticket.priority,
    book: ticket.book,
    author: {
      id: ticket.author.id,
      name: ticket.author.user.name,
      email: ticket.author.user.email,
      phone: ticket.author.phone,
      city: ticket.author.city,
      joinedDate: ticket.author.joinedDate,
      books: ticket.author.books,
    },
    assignee: ticket.assignee,
    firstResponseAt: ticket.firstResponseAt,
    ai: {
      status: ticket.aiStatus,
      category: ticket.aiCategory,
      priority: ticket.aiPriority,
      reason: ticket.aiReason,
      draft: ticket.aiDraft,
      draftSource: ticket.aiDraftSource,
      draftGeneratedAt: ticket.aiDraftAt,
    },
    events: ticket.events.map((event) => ({
      id: event.id,
      message: event.message,
      actor: event.actor?.name ?? "System",
      createdAt: event.createdAt,
    })),
  };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createTicket(user: AuthUser, input: CreateTicketInput) {
  if (!user.authorId) throw forbidden("Only authors can raise tickets.");

  if (input.bookId) {
    const book = await prisma.book.findFirst({ where: { id: input.bookId, authorId: user.authorId } });
    if (!book) {
      throw badRequest("Choose one of your own books, or General / Account level.", [
        { field: "bookId", message: "Unknown book" },
      ]);
    }
  }

  const ticket = await prisma.ticket.create({
    data: {
      authorId: user.authorId,
      bookId: input.bookId || null,
      subject: input.subject,
      description: input.description,
      attachmentName: input.attachmentName || null,
      events: { create: { actorId: user.id, message: "Ticket created" } },
    },
  });

  publish({ type: "ticket.created", ticketId: ticket.id, authorId: ticket.authorId });

  // Classification runs after the response is sent: an author never waits on
  // the LLM, and a slow or failing provider can't block ticket creation.
  void classifyAndSave(ticket.id);

  return getTicket(user, ticket.id);
}

// ---------------------------------------------------------------------------
// Update (admin)
// ---------------------------------------------------------------------------

function statusTimestamps(status: TicketStatus, current: { resolvedAt: Date | null }) {
  const isDone = status === "RESOLVED" || status === "CLOSED";
  return { resolvedAt: isDone ? (current.resolvedAt ?? new Date()) : null };
}

export async function updateTicket(admin: AuthUser, id: string, input: UpdateTicketInput) {
  const ticket = await prisma.ticket.findUnique({ where: { id }, include: { assignee: true } });
  if (!ticket) throw notFound("Ticket");

  const data: Prisma.TicketUpdateInput = {};
  const events: string[] = [];

  if (input.status && input.status !== ticket.status) {
    Object.assign(data, { status: input.status, ...statusTimestamps(input.status, ticket) });
    events.push(`Status changed from ${STATUS_LABELS[ticket.status]} to ${STATUS_LABELS[input.status]}`);
  }

  if (input.category && input.category !== ticket.category) {
    data.category = input.category;
    const from = ticket.category ? CATEGORY_LABELS[ticket.category] : "unclassified";
    events.push(`Category changed from ${from} to ${CATEGORY_LABELS[input.category]}`);
  }

  if (input.priority && input.priority !== ticket.priority) {
    data.priority = input.priority;
    const from = ticket.priority ? PRIORITY_LABELS[ticket.priority] : "unset";
    events.push(`Priority changed from ${from} to ${PRIORITY_LABELS[input.priority]}`);
  }

  if (input.assigneeId !== undefined && input.assigneeId !== ticket.assigneeId) {
    if (input.assigneeId === null) {
      data.assignee = { disconnect: true };
      events.push(`Unassigned from ${ticket.assignee?.name ?? "nobody"}`);
    } else {
      const assignee = await prisma.user.findFirst({ where: { id: input.assigneeId, role: "ADMIN" } });
      if (!assignee) {
        throw badRequest("Tickets can only be assigned to admins.", [
          { field: "assigneeId", message: "Unknown admin" },
        ]);
      }
      data.assignee = { connect: { id: assignee.id } };
      events.push(`Assigned to ${assignee.name}`);
    }
  }

  if (events.length) {
    data.events = { create: events.map((message) => ({ message, actorId: admin.id })) };
    await prisma.ticket.update({ where: { id }, data });
    // Authors only see status changes; category/priority/assignee are internal.
    publish({ type: "ticket.updated", ticketId: id, authorId: ticket.authorId, adminOnly: !data.status });
  }

  return getTicket(admin, id);
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function addMessage(user: AuthUser, id: string, input: CreateMessageInput) {
  const ticket = await prisma.ticket.findFirst({ where: { id, ...ownership(user) } });
  if (!ticket) throw notFound("Ticket");

  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && input.internal) throw forbidden("Authors can't add internal notes.");
  if (!isAdmin && input.status) throw forbidden("Authors can't change ticket status.");
  if (!isAdmin && ticket.status === "CLOSED") {
    throw conflict("This ticket is closed. Please raise a new ticket if you still need help.");
  }

  const data: Prisma.TicketUpdateInput = {
    messages: {
      create: {
        senderId: user.id,
        body: input.body,
        isInternal: isAdmin && input.internal,
        usedAiDraft: isAdmin && input.usedAiDraft,
      },
    },
  };
  const events: string[] = [];
  let nextStatus: TicketStatus | undefined;

  if (isAdmin && !input.internal) {
    // A reply moves an open ticket into progress and claims it if nobody has.
    nextStatus = input.status ?? (ticket.status === "OPEN" ? "IN_PROGRESS" : undefined);
    if (!ticket.firstResponseAt) data.firstResponseAt = new Date();
    if (!ticket.assigneeId) {
      data.assignee = { connect: { id: user.id } };
      events.push(`Assigned to ${user.name}`);
    }
    // The draft has been used (or replaced); the next one should reflect this reply.
    Object.assign(data, { aiDraft: null, aiDraftSource: null, aiDraftAt: null });
  }

  if (isAdmin && input.internal && input.status) nextStatus = input.status;

  if (!isAdmin) {
    // New information from the author makes any cached draft stale.
    Object.assign(data, { aiDraft: null, aiDraftSource: null, aiDraftAt: null });
    if (ticket.status === "RESOLVED") {
      nextStatus = "OPEN";
      events.push("Reopened by author reply");
    }
  }

  if (nextStatus && nextStatus !== ticket.status) {
    Object.assign(data, { status: nextStatus, ...statusTimestamps(nextStatus, ticket) });
    events.push(`Status changed from ${STATUS_LABELS[ticket.status]} to ${STATUS_LABELS[nextStatus]}`);
  }

  if (events.length) {
    data.events = { create: events.map((message) => ({ message, actorId: user.id })) };
  }

  await prisma.ticket.update({ where: { id }, data });
  publish({
    type: "ticket.updated",
    ticketId: id,
    authorId: ticket.authorId,
    adminOnly: input.internal && !nextStatus,
  });

  return getTicket(user, id);
}
