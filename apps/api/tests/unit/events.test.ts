import type { Response } from "express";
import { describe, expect, it } from "vitest";
import type { AuthUser } from "../../src/lib/auth";
import { publish, subscribe } from "../../src/realtime/events";

function fakeStream() {
  const chunks: string[] = [];
  return { chunks, res: { write: (chunk: string) => chunks.push(chunk) } as unknown as Response };
}

const author = (authorId: string): AuthUser => ({ id: authorId, name: "", email: "", role: "AUTHOR", authorId });
const admin: AuthUser = { id: "admin", name: "", email: "", role: "ADMIN", authorId: null };

describe("live events", () => {
  it("sends authors only their own ticket events, and admins everything", () => {
    const priya = fakeStream();
    const rohit = fakeStream();
    const ops = fakeStream();
    const unsubscribe = [
      subscribe(author("AUTH001"), priya.res),
      subscribe(author("AUTH002"), rohit.res),
      subscribe(admin, ops.res),
    ];

    publish({ type: "ticket.updated", ticketId: "t1", authorId: "AUTH001" });
    publish({ type: "ticket.updated", ticketId: "t1", authorId: "AUTH001", adminOnly: true });

    expect(priya.chunks).toHaveLength(1);
    expect(priya.chunks[0]).toContain('"ticketId":"t1"');
    expect(rohit.chunks).toHaveLength(0);
    expect(ops.chunks).toHaveLength(2);

    unsubscribe.forEach((fn) => fn());
  });
});
