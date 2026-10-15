import request from "supertest";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { setLlmProvider, type LlmProvider } from "../src/ai/llm";
import { prisma } from "../src/lib/prisma";
import { classifyAndSave } from "../src/services/ai.service";

const app = createApp();

let priya: string; // AUTH001: BK001, BK002
let rohit: string; // AUTH002
let kavita: string; // AUTH009: one book in production, one with ₹850 pending
let admin: string;

async function login(email: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

function fakeProvider(reply: string | Error) {
  const provider: LlmProvider & { calls: number } = {
    name: "fake",
    calls: 0,
    async complete() {
      provider.calls++;
      if (reply instanceof Error) throw reply;
      return { text: reply, inputTokens: 500, outputTokens: 80, cachedTokens: 0 };
    },
  };
  return provider;
}

async function seededTicket(number: number) {
  return prisma.ticket.findUniqueOrThrow({ where: { number } });
}

async function createTicket(token: string, body: Record<string, unknown>) {
  return request(app).post("/api/tickets").set(auth(token)).send(body);
}

beforeAll(async () => {
  [priya, rohit, kavita, admin] = await Promise.all([
    login("priya.sharma@email.com", "author123"),
    login("rohit.kapoor@email.com", "author123"),
    login("kavita.deshmukh@email.com", "author123"),
    login("admin@bookleaf.demo", "admin123"),
  ]);
});

afterEach(() => setLlmProvider(null));

describe("auth", () => {
  it("rejects wrong passwords without revealing whether the email exists", async () => {
    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: "priya.sharma@email.com", password: "nope" });
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@email.com", password: "nope" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it("sets an httpOnly session cookie", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "priya.sharma@email.com", password: "author123" });
    expect(res.headers["set-cookie"]?.[0]).toMatch(/bl_session=.+HttpOnly/);
  });

  it("validates the login body", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual(["email", "password"]);
  });

  it("protects every data route", async () => {
    for (const path of ["/api/books", "/api/tickets", "/api/admin/stats", "/api/auth/me"]) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("rejects tampered tokens", async () => {
    const res = await request(app).get("/api/tickets").set(auth(priya.slice(0, -2) + "xx"));
    expect(res.status).toBe(401);
  });
});

describe("books", () => {
  it("only returns the signed-in author's books", async () => {
    const res = await request(app).get("/api/books").set(auth(priya));
    expect(res.status).toBe(200);
    expect(res.body.books).toHaveLength(2);
    expect(res.body.books.every((book: { authorId: string }) => book.authorId === "AUTH001")).toBe(true);
  });

  it("ignores authorId for authors", async () => {
    const res = await request(app).get("/api/books?authorId=AUTH002").set(auth(priya));
    expect(res.body.books.every((book: { authorId: string }) => book.authorId === "AUTH001")).toBe(true);
  });

  it("handles books in production and balances below the payout threshold", async () => {
    const res = await request(app).get("/api/books").set(auth(kavita));
    const inProduction = res.body.books.find((book: { id: string }) => book.id === "BK015");
    expect(inProduction.status).toBe("TYPESETTING");
    expect(inProduction.totalRoyaltyEarned).toBe(0);
    expect(res.body.summary.royaltyPending).toBe(850);
    expect(res.body.summary.nextPayout.eligible).toBe(false);
  });

  it("returns 404 for another author's book", async () => {
    const res = await request(app).get("/api/books/BK003").set(auth(priya));
    expect(res.status).toBe(404);
  });
});

describe("tickets: access control", () => {
  it("hides other authors' tickets behind a 404", async () => {
    const rohitsTicket = await seededTicket(1002);
    const res = await request(app).get(`/api/tickets/${rohitsTicket.id}`).set(auth(priya));
    expect(res.status).toBe(404);
  });

  it("only lists the author's own tickets", async () => {
    const res = await request(app).get("/api/tickets").set(auth(rohit));
    expect(res.body.tickets.length).toBeGreaterThan(0);
    for (const ticket of res.body.tickets) expect(ticket.author).toBeUndefined();
  });

  it("forbids authors from admin-only actions", async () => {
    const ticket = await seededTicket(1002);
    const patch = await request(app).patch(`/api/tickets/${ticket.id}`).set(auth(rohit)).send({ status: "CLOSED" });
    const draft = await request(app).post(`/api/tickets/${ticket.id}/draft`).set(auth(rohit));
    const stats = await request(app).get("/api/admin/stats").set(auth(rohit));
    expect([patch.status, draft.status, stats.status]).toEqual([403, 403, 403]);
  });

  it("only lets authors create tickets", async () => {
    const res = await createTicket(admin, { subject: "Admin ticket", description: "Admins shouldn't raise tickets." });
    expect(res.status).toBe(403);
  });
});

describe("tickets: lifecycle", () => {
  it("validates new tickets with field-level errors", async () => {
    const res = await createTicket(priya, { subject: "Hi", description: "Too short" });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual(["subject", "description"]);
  });

  it("rejects a book that belongs to someone else", async () => {
    const res = await createTicket(priya, {
      bookId: "BK003",
      subject: "Not my book",
      description: "This book belongs to another author and should be rejected.",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe("bookId");
  });

  it("saves the ticket immediately and classifies it even with no AI configured", async () => {
    const res = await createTicket(priya, {
      bookId: "BK001",
      subject: "No royalty for 6 months",
      description: "I haven't received any royalty for 6 months even though my book is selling.",
    });
    expect(res.status).toBe(201);
    expect(res.body.ticket.number).toBeGreaterThan(1000);

    await classifyAndSave(res.body.ticket.id);
    const detail = await request(app).get(`/api/tickets/${res.body.ticket.id}`).set(auth(admin));
    expect(detail.body.ticket.category).toBe("ROYALTY_PAYMENTS");
    expect(detail.body.ticket.priority).toBe("CRITICAL");
    expect(detail.body.ticket.ai.status).toBe("FALLBACK");
  });

  it("supports General / Account level tickets without a book", async () => {
    const res = await createTicket(priya, {
      bookId: null,
      subject: "Update my author bio",
      description: "How can I update my author bio on all platforms?",
    });
    expect(res.status).toBe(201);
    expect(res.body.ticket.book).toBeNull();
  });

  it("keeps internal notes away from the author", async () => {
    const ticket = await seededTicket(1001); // Ananya's
    await request(app)
      .post(`/api/tickets/${ticket.id}/messages`)
      .set(auth(admin))
      .send({ body: "Bank details look incomplete.", internal: true })
      .expect(201);
    await request(app)
      .post(`/api/tickets/${ticket.id}/messages`)
      .set(auth(admin))
      .send({ body: "Hi Ananya, we're looking into this now." })
      .expect(201);

    const ananya = await login("ananya.reddy@email.com", "author123");
    const authorView = await request(app).get(`/api/tickets/${ticket.id}`).set(auth(ananya));
    const bodies = authorView.body.ticket.messages.map((m: { body: string }) => m.body);
    expect(bodies).toEqual(["Hi Ananya, we're looking into this now."]);
    expect(authorView.body.ticket.status).toBe("IN_PROGRESS");
    expect(authorView.body.ticket.priority).toBeUndefined();
    expect(authorView.body.ticket.ai).toBeUndefined();

    const adminView = await request(app).get(`/api/tickets/${ticket.id}`).set(auth(admin));
    expect(adminView.body.ticket.messages).toHaveLength(2);
    expect(adminView.body.ticket.assignee.name).toBe("Neha Verma");
    expect(adminView.body.ticket.firstResponseAt).not.toBeNull();
  });

  it("reopens a resolved ticket when the author replies", async () => {
    const ticket = await seededTicket(1007); // Priya's, resolved
    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/messages`)
      .set(auth(priya))
      .send({ body: "Thanks! One more question about this." });
    expect(res.status).toBe(201);
    expect(res.body.ticket.status).toBe("OPEN");
  });

  it("blocks replies on closed tickets", async () => {
    const ticket = await seededTicket(1008); // Arjun's, closed
    const arjun = await login("arjun.malhotra@email.com", "author123");
    const res = await request(app).post(`/api/tickets/${ticket.id}/messages`).set(auth(arjun)).send({ body: "Hello?" });
    expect(res.status).toBe(409);
  });

  it("records status, priority and assignment changes in the audit trail", async () => {
    const ticket = await seededTicket(1004);
    const me = await request(app).get("/api/auth/me").set(auth(admin));
    const res = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set(auth(admin))
      .send({ status: "IN_PROGRESS", priority: "HIGH", assigneeId: me.body.user.id });
    expect(res.status).toBe(200);
    const events = res.body.ticket.events.map((e: { message: string }) => e.message);
    expect(events).toEqual(
      expect.arrayContaining(["Status changed from Open to In Progress", "Assigned to Neha Verma"]),
    );
  });

  it("filters and sorts the admin queue", async () => {
    const res = await request(app).get("/api/tickets?status=OPEN,IN_PROGRESS&sort=oldest").set(auth(admin));
    expect(res.status).toBe(200);
    const statuses = new Set(res.body.tickets.map((t: { status: string }) => t.status));
    expect([...statuses].every((s) => s === "OPEN" || s === "IN_PROGRESS")).toBe(true);
    const created = res.body.tickets.map((t: { createdAt: string }) => t.createdAt);
    expect(created).toEqual([...created].sort());
  });

  it("rejects unknown filter values", async () => {
    const res = await request(app).get("/api/tickets?status=DONE").set(auth(admin));
    expect(res.status).toBe(400);
  });
});

describe("AI integration", () => {
  it("uses the model's classification when it responds", async () => {
    const ticket = await seededTicket(1002);
    setLlmProvider(
      fakeProvider(JSON.stringify({ category: "ISBN_METADATA", priority: "CRITICAL", reason: "Live book has a mismatched ISBN." })),
    );
    await classifyAndSave(ticket.id);

    const updated = await seededTicket(1002);
    expect(updated.aiStatus).toBe("COMPLETED");
    expect(updated.category).toBe("ISBN_METADATA");
    expect(updated.priority).toBe("CRITICAL");
    expect(updated.aiReason).toBe("Live book has a mismatched ISBN.");
  });

  it("falls back to rules when the model returns something unusable", async () => {
    const ticket = await seededTicket(1004);
    setLlmProvider(fakeProvider(JSON.stringify({ category: "SOMETHING_ELSE", priority: "URGENT" })));
    await classifyAndSave(ticket.id);
    const updated = await seededTicket(1004);
    expect(updated.aiStatus).toBe("FALLBACK");
    expect(updated.category).toBe("DISTRIBUTION");
  });

  it("never overwrites an admin's override", async () => {
    const ticket = await seededTicket(1003);
    await classifyAndSave(ticket.id);
    await request(app).patch(`/api/tickets/${ticket.id}`).set(auth(admin)).send({ category: "GENERAL" }).expect(200);

    setLlmProvider(fakeProvider(JSON.stringify({ category: "PRINTING_QUALITY", priority: "HIGH", reason: "Defective copies." })));
    const res = await request(app).post(`/api/tickets/${ticket.id}/classify`).set(auth(admin));
    expect(res.body.ticket.category).toBe("GENERAL");
    expect(res.body.ticket.ai.category).toBe("PRINTING_QUALITY");
  });

  it("caches drafts and only calls the model again on regenerate", async () => {
    const ticket = await seededTicket(1006);
    const provider = fakeProvider("Hi Sneha,\n\nThank you for your question about your royalty amount...\n\nWarm regards,\nBookLeaf Author Support");
    setLlmProvider(provider);

    const first = await request(app).post(`/api/tickets/${ticket.id}/draft`).set(auth(admin)).send({});
    const second = await request(app).post(`/api/tickets/${ticket.id}/draft`).set(auth(admin)).send({});
    expect(first.body.source).toBe("AI");
    expect(second.body.draft).toBe(first.body.draft);
    expect(provider.calls).toBe(1);

    await request(app).post(`/api/tickets/${ticket.id}/draft`).set(auth(admin)).send({ regenerate: true });
    expect(provider.calls).toBe(2);
  });

  it("returns a template draft when the AI is down, and logs the failure", async () => {
    const ticket = await seededTicket(1005);
    setLlmProvider(fakeProvider(new Error("529 overloaded")));

    const res = await request(app).post(`/api/tickets/${ticket.id}/draft`).set(auth(admin)).send({ regenerate: true });
    expect(res.status).toBe(200);
    expect(res.body.source).toBe("TEMPLATE");
    expect(res.body.draft).toMatch(/^Hi Kavita,/);

    // Logging is fire-and-forget; give it a moment.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const failed = await prisma.aiCall.findFirst({ where: { ticketId: ticket.id, success: false } });
    expect(failed?.error).toContain("529");
  });

  it("reports AI usage and accuracy to admins", async () => {
    const res = await request(app).get("/api/admin/stats").set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.ai.last30Days.calls).toBeGreaterThan(0);
    expect(res.body.ai.accuracy.classified).toBeGreaterThan(0);
  });
});
