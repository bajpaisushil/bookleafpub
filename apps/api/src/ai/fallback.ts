import type { TicketCategory, TicketPriority } from "../generated/prisma/client";
import { bookStatusLabel } from "../lib/labels";
import { PAYOUT_THRESHOLD, formatDate, formatRupees, getNextPayout } from "../lib/royalty";
import type { TicketContext } from "./context";

// Used when the LLM is not configured, down or rate limited. Rules are less
// accurate than the model, but tickets still arrive classified and admins
// still get a policy-correct starting point for their reply.

// Strong signals almost always decide the category on their own (3 points);
// weak ones only help break ties (1 point). "Amazon shows the wrong ISBN"
// mentions Amazon, but it's an ISBN problem.
const CATEGORY_KEYWORDS: { category: TicketCategory; strong: string[]; weak: string[] }[] = [
  {
    category: "ISBN_METADATA",
    strong: ["isbn", "metadata", "barcode"],
    weak: ["imprint", "wrong title", "wrong author", "wrong price"],
  },
  {
    category: "ROYALTY_PAYMENTS",
    strong: ["royalt", "payout"],
    weak: ["payment", "paid", "bank", "earning", "₹", "rupee", "statement"],
  },
  {
    category: "PRINTING_QUALITY",
    strong: ["blurry", "misalign", "binding", "reprint", "print quality"],
    weak: ["print", "defect", "damaged", "torn", "colour", "color", "quality"],
  },
  {
    category: "DISTRIBUTION",
    strong: ["unavailable", "not available", "out of stock"],
    weak: ["amazon", "flipkart", "listing", "bookleaf store"],
  },
  {
    category: "BOOK_STATUS",
    strong: ["typesetting", "cover design", "proofread", "production"],
    weak: ["editing", "manuscript", "stage", "when will", "delay"],
  },
];

const HOW_TO_QUESTION = /\b(how (do|can) i|can i|is it possible|could i)\b.*\b(update|change|edit|add)\b/;

export function classifyWithRules(
  subject: string,
  description: string,
): {
  category: TicketCategory;
  priority: TicketPriority;
  reason: string;
} {
  const text = `${subject} ${description}`.toLowerCase();
  const hits = (keywords: string[]) => keywords.filter((keyword) => text.includes(keyword)).length;

  let category: TicketCategory = "GENERAL";
  let bestScore = 0;
  for (const { category: candidate, strong, weak } of CATEGORY_KEYWORDS) {
    const score = hits(strong) * 3 + hits(weak);
    if (score > bestScore) {
      category = candidate;
      bestScore = score;
    }
  }

  // "Can I update my description on Amazon?" is a how-to question, not a
  // distribution problem.
  if (HOW_TO_QUESTION.test(text) && category !== "ISBN_METADATA") category = "GENERAL";

  return { category, ...priorityWithRules(text, category) };
}

function priorityWithRules(text: string, category: TicketCategory): { priority: TicketPriority; reason: string } {
  if (/\b(legal|lawyer|copyright|fraud|hacked|stolen)\b/.test(text)) {
    return { priority: "CRITICAL", reason: "Mentions a legal, fraud or account security concern." };
  }
  if (/\b([6-9]|1[0-2]|six|seven|eight|nine|ten|twelve) months\b/.test(text) && category === "ROYALTY_PAYMENTS") {
    return { priority: "CRITICAL", reason: "Royalty reported missing for six months or more." };
  }
  if (/duplicate isbn|wrong book/.test(text)) {
    return { priority: "CRITICAL", reason: "Possible duplicate ISBN or wrong book linked to a listing." };
  }
  if (category === "ISBN_METADATA" && text.includes("isbn")) {
    return { priority: "HIGH", reason: "ISBN errors are escalated to production as high priority." };
  }
  if (/(not|never|haven't|have not) (received|been paid|got)|no royalty|overdue/.test(text)) {
    return { priority: "HIGH", reason: "Author reports a missing or overdue payment." };
  }
  if (/blurry|misalign|defect|damaged|binding|torn/.test(text)) {
    return { priority: "HIGH", reason: "Defective printed copies reported." };
  }
  if (/unavailable|not available|out of stock/.test(text)) {
    return { priority: "HIGH", reason: "Published book reported unavailable on a platform." };
  }
  if (/\b(urgent|asap|immediately|launch|deadline)\b/.test(text)) {
    return { priority: "HIGH", reason: "Author mentions urgency or a deadline." };
  }
  if (category === "GENERAL") {
    return { priority: "LOW", reason: "General information request." };
  }
  return { priority: "MEDIUM", reason: "Standard request with no urgency signals." };
}

export function buildTemplateDraft(ctx: TicketContext, today = new Date()) {
  const firstName = ctx.author.user.name.split(" ")[0];
  const category = ctx.category ?? classifyWithRules(ctx.subject, ctx.description).category;
  const title = ctx.book ? `"${ctx.book.title}"` : "your account";
  const payout = getNextPayout(today);
  const pending = ctx.author.books.reduce((sum, book) => sum + book.royaltyPending, 0);

  const pendingLine =
    pending >= PAYOUT_THRESHOLD
      ? `You currently have ${formatRupees(pending)} in pending royalties, which will be paid for the ${payout.quarterLabel} quarter by ${formatDate(payout.payoutDueBy)}.`
      : `Your pending balance is ${formatRupees(pending)}, which is below the ${formatRupees(PAYOUT_THRESHOLD)} minimum payout, so it will roll over to the next quarter.`;

  const bodies: Record<TicketCategory, string> = {
    ROYALTY_PAYMENTS: `Thank you for reaching out about the royalties for ${title}, and I'm sorry for the worry this has caused.

Royalties are calculated quarterly and paid within 45 days of the quarter ending, by bank transfer to the account linked in your dashboard. ${pendingLine}

I've asked our finance team to review your account, including your linked bank details, and we'll get back to you within 48 hours with a clear update and a line-by-line breakdown.`,

    ISBN_METADATA: `Thank you for flagging this. An ISBN or listing error on ${title} is a serious issue, and I'm sorry it has happened.

I've escalated it to our production team as a high-priority fix. We'll correct the record and confirm the change with you within 48 hours.`,

    PRINTING_QUALITY: `I'm really sorry that your copies of ${title} didn't arrive in the condition they should have.

Could you please reply with a few photos of the defective pages or binding? Once we've verified the issue, we'll arrange a free reprint, which usually takes 5–7 business days.`,

    DISTRIBUTION: `Thank you for letting us know about the availability of ${title}. When a published book shows as unavailable, it's usually a stock sync issue with the platform.

We're triggering a re-sync with our distribution team now, and the listing should be live again within 24–48 hours. We'll confirm once it's back.`,

    BOOK_STATUS: ctx.book
      ? `Thank you for checking in on ${title}. I completely understand how eager you are to see it published.

Your book is currently at the ${bookStatusLabel(ctx.book.status)} stage. I'm checking with the production team on the exact timeline and will come back to you within 48 hours with a specific date for the next stage.`
      : `Thank you for checking in. I'm confirming the current production status with our team and will come back to you within 48 hours with a specific timeline.`,

    GENERAL: `Thank you for getting in touch. I'm looking into your question and will make sure you get a complete answer.

Our team will confirm the details and get back to you within 48 hours.`,
  };

  return `Hi ${firstName},

${bodies[category]}

Warm regards,
BookLeaf Author Support`;
}
