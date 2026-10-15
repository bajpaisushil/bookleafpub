import type { TicketCategory } from "../generated/prisma/client";

// BookLeaf's support knowledge base, split by ticket category so each prompt
// only carries the policy it needs. The short company overview goes into the
// cached system prompt for every request.

export const COMPANY_OVERVIEW = `- BookLeaf Publishing is a self-publishing company operating in India and the US.
- Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium, paid package with marketing and distribution add-ons).
- BookLeaf handles cover design, typesetting, ISBN assignment, printing, distribution and royalty management for its authors.
- In-house printing facility and warehouse in Delhi; print partners Repro India and Epitome Books.
- Books are sold on Amazon India, Flipkart, Amazon US, Amazon UK and the BookLeaf Store.`;

export const POLICIES: Record<TicketCategory, string> = {
  ROYALTY_PAYMENTS: `Royalty policy:
- 80/20 split: the author receives 80% of the net profit per book, BookLeaf keeps 20%.
- Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart) and shipping charges. This is why royalty per copy is much lower than the MRP.
- Royalties are calculated quarterly and paid within 45 days of the quarter ending.
- Minimum payout threshold is ₹1,000. If accumulated royalties are below this, they roll over to the next quarter.
- Payouts are made by bank transfer to the bank account linked in the author's dashboard. Payments cannot be made if no bank account is linked.
- Authors can see a detailed royalty breakdown in their dashboard, with sales figures per platform. We can also share a line-by-line breakdown on request.
- If a payment is genuinely overdue (balance above the threshold and the 45-day window has passed), escalate to the finance team and commit to a resolution within 48 hours.`,

  ISBN_METADATA: `ISBN and metadata policy:
- Every book published through BookLeaf receives a unique ISBN assigned by BookLeaf, registered under BookLeaf's publisher imprint.
- Authors who want an ISBN under their own imprint must obtain it independently.
- ISBN errors (duplicate ISBN, wrong book linked, a platform showing a different ISBN than the printed copy) are high priority: escalate to the production team immediately and commit to a resolution within 48 hours.
- Metadata (description, keywords, author bio) can be updated after a book is live, through the dashboard or by emailing the BookLeaf team. Changes typically reflect on platforms within 3–5 business days.`,

  PRINTING_QUALITY: `Printing and quality policy:
- Most orders are printed at BookLeaf's in-house facility in Delhi. Overflow or special formats go to Repro India or Epitome Books.
- Standard print turnaround is 5–7 business days from order confirmation.
- For quality issues (misprints, blurry images, misaligned pages, binding defects, colour inconsistency), BookLeaf arranges a free reprint after verification. The author may need to share photos of the defective copies.
- Reprints take 5–7 business days once the defect is verified.`,

  DISTRIBUTION: `Distribution and availability policy:
- Books are listed on Amazon India, Flipkart, Amazon US, Amazon UK and the BookLeaf Store.
- New listings typically go live within 7–10 business days after publication is complete.
- A published book showing as "Currently unavailable" on a platform usually means a stock sync issue. BookLeaf's team can trigger a re-sync; the listing is normally live again within 24–48 hours.
- A book is only sold on the platforms it is listed on; adding a platform is a request the team can review.`,

  BOOK_STATUS: `Production policy:
- Stages, in order: Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.
- Authors receive an email update at each stage.
- Delays usually happen at Cover Design (waiting for the author's approval) and Proofreading (revision rounds).
- Be honest about why a book is delayed and give a specific updated timeline. Even when the book is waiting on the author, frame it collaboratively and never blame them.
- After publication, new listings go live on platforms within 7–10 business days.`,

  GENERAL: `General account policy:
- Book metadata (description, keywords) and author profile details can be updated after publication through the dashboard or by emailing the BookLeaf team. Changes typically reflect on platforms within 3–5 business days.
- Royalties are paid quarterly within 45 days of the quarter ending (minimum ₹1,000), to the bank account linked in the dashboard.
- For anything not covered by policy, the team confirms the answer and replies within 48 hours.`,
};

// Calibration examples from BookLeaf's support playbook. Only the examples for
// the ticket's category are sent with a draft request.
export const EXAMPLES: Record<TicketCategory, { query: string; approach: string }[]> = {
  ROYALTY_PAYMENTS: [
    {
      query: "I published my book 4 months ago and still haven't received any royalty. What's going on?",
      approach:
        "Acknowledge the frustration. Explain the quarterly royalty cycle and 45-day payout window. Check whether bank details are linked. Give the specific next payout date. If the payment is genuinely overdue, escalate with a 48-hour resolution timeline.",
    },
    {
      query: "My royalty amount seems too low. I sold 200 copies but only received ₹3,000.",
      approach:
        "Explain the net profit calculation: MRP minus printing, platform commission and shipping. Offer a detailed line-by-line royalty breakdown. Don't be defensive; offer transparency.",
    },
  ],
  ISBN_METADATA: [
    {
      query: "My book is showing a different ISBN on Amazon than what's on the physical copy.",
      approach:
        "Treat as high priority and acknowledge that this is a serious data issue. Confirm it is being escalated to the production team immediately. Give a 48-hour resolution timeline.",
    },
  ],
  PRINTING_QUALITY: [
    {
      query:
        "I received my author copies and the print quality is terrible. The images are blurry and pages are misaligned.",
      approach:
        "Apologise sincerely. Ask the author to share photos of the defective copies. Confirm BookLeaf will arrange a free reprint once verified, with a timeline of 5–7 business days.",
    },
  ],
  DISTRIBUTION: [
    {
      query: "My book is published but it's showing as 'Currently Unavailable' on Amazon.",
      approach:
        "Explain this is typically a stock sync issue. Confirm a re-sync is being triggered with the distribution team. Set the expectation of 24–48 hours for it to go live again.",
    },
  ],
  BOOK_STATUS: [
    {
      query: "It's been 3 weeks and my book is still in typesetting. When will it be done?",
      approach:
        "Check the actual production status. If delayed, be honest about why. Give a specific updated timeline. Don't blame the author even if the delay is on their side; frame it collaboratively.",
    },
  ],
  GENERAL: [
    {
      query: "Can I update the description of my book on Amazon after it's already live?",
      approach:
        "Yes: metadata updates can be submitted through the dashboard or by emailing the BookLeaf team. Changes typically reflect on platforms within 3–5 business days.",
    },
  ],
};
