import type { Response } from "express";
import type { AuthUser } from "../lib/auth";

// Lightweight pub/sub for Server-Sent Events. Events only say *what* changed;
// clients refetch through the normal REST endpoints, so access rules are
// enforced in one place.
//
// This keeps subscribers in memory, which is fine for a single API instance.
// To run several instances, publish through Redis or Postgres LISTEN/NOTIFY
// and fan out to local subscribers on each instance.

interface Subscriber {
  user: AuthUser;
  res: Response;
}

export interface LiveEvent {
  type: "ticket.created" | "ticket.updated";
  ticketId: string;
  authorId: string;
  // Internal notes, AI drafts etc. only interest admins.
  adminOnly?: boolean;
}

const subscribers = new Set<Subscriber>();

export function subscribe(user: AuthUser, res: Response) {
  const subscriber = { user, res };
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}

export function publish(event: LiveEvent) {
  const payload = `event: ${event.type}\ndata: ${JSON.stringify({ ticketId: event.ticketId })}\n\n`;

  for (const { user, res } of subscribers) {
    const isAdmin = user.role === "ADMIN";
    const isOwner = !event.adminOnly && user.authorId === event.authorId;
    if (isAdmin || isOwner) res.write(payload);
  }
}

export const subscriberCount = () => subscribers.size;
