import { describe, expect, it } from "vitest";
import type { TicketContext } from "../../src/ai/context";
import { buildTemplateDraft } from "../../src/ai/fallback";
import { DRAFT_SYSTEM, buildClassifyPrompt, buildDraftPrompt } from "../../src/ai/prompts";

const today = new Date("2026-10-15T12:00:00Z");

function makeContext(overrides: Partial<TicketContext> = {}): TicketContext {
  return {
    id: "t1",
    number: 1042,
    authorId: "AUTH001",
    bookId: "BK001",
    subject: "Royalty not received",
    description: "I haven't received my royalty for Whispers of the Ganges.",
    status: "OPEN",
    category: "ROYALTY_PAYMENTS",
    priority: "HIGH",
    createdAt: new Date("2026-10-13T12:00:00Z"),
    book: {
      id: "BK001",
      title: "Whispers of the Ganges",
      isbn: "978-93-5XXXX-01-1",
      genre: "Literary Fiction",
      status: "PUBLISHED",
      publicationDate: new Date("2023-06-20"),
      mrp: 399,
      authorRoyaltyPerCopy: 35,
      totalCopiesSold: 342,
      totalRoyaltyEarned: 11970,
      royaltyPaid: 8400,
      royaltyPending: 3570,
      lastRoyaltyPayoutDate: new Date("2025-10-15"),
      printPartner: "In-House",
      availableOn: ["Amazon India", "Flipkart"],
    },
    author: {
      id: "AUTH001",
      city: "Mumbai",
      joinedDate: new Date("2023-03-15"),
      user: { name: "Priya Sharma" },
      books: [
        { id: "BK001", title: "Whispers of the Ganges", status: "PUBLISHED", royaltyPending: 3570 },
        { id: "BK002", title: "The Saffron Diaries", status: "PUBLISHED", royaltyPending: 0 },
      ],
    },
    messages: [],
    ...overrides,
  } as unknown as TicketContext;
}

describe("buildDraftPrompt", () => {
  it("includes only the policy section for the ticket's category", () => {
    const prompt = buildDraftPrompt(makeContext(), today);
    expect(prompt).toContain("80/20 split");
    expect(prompt).not.toContain("re-sync"); // distribution policy
    expect(prompt).not.toContain("free reprint"); // printing policy
  });

  it("gives the model concrete account facts to quote", () => {
    const prompt = buildDraftPrompt(makeContext(), today);
    expect(prompt).toContain("first name: Priya");
    expect(prompt).toContain("₹3,570");
    expect(prompt).toContain("Jul–Sep 2026, due by 14 Nov 2026");
    expect(prompt).toContain("The Saffron Diaries");
  });

  it("describes production stage for unpublished books instead of sales", () => {
    const ctx = makeContext({ category: "BOOK_STATUS" });
    ctx.book = { ...ctx.book!, status: "TYPESETTING", publicationDate: null, totalCopiesSold: 0 };
    const prompt = buildDraftPrompt(ctx, today);
    expect(prompt).toContain("stage 4 of 9: Typesetting");
    expect(prompt).toContain("Next stage: Proofreading");
    expect(prompt).not.toContain("Copies sold");
  });

  it("keeps the static system prompt free of per-ticket data so it can be cached", () => {
    expect(DRAFT_SYSTEM).not.toContain("Priya");
    expect(DRAFT_SYSTEM).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe("buildClassifyPrompt", () => {
  it("truncates very long descriptions to control token usage", () => {
    const prompt = buildClassifyPrompt(makeContext({ description: "x".repeat(10_000) }), today);
    expect(prompt.length).toBeLessThan(5_500);
    expect(prompt).toContain("[…]");
  });
});

describe("buildTemplateDraft", () => {
  it("produces a usable, specific reply without the LLM", () => {
    const draft = buildTemplateDraft(makeContext(), today);
    expect(draft).toMatch(/^Hi Priya,/);
    expect(draft).toContain("₹3,570");
    expect(draft).toContain("14 Nov 2026");
    expect(draft).toContain("within 48 hours");
    expect(draft.trim()).toMatch(/BookLeaf Author Support$/);
  });
});
