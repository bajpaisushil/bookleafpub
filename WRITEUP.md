# Approach: BookLeaf Author Support Portal

## What I prioritised

I started from the problem rather than the screens: authors write in because they can't see their money or their book's progress, and the ops team answers each query from scratch. So I prioritised, in order:

1. **A trustworthy ticket lifecycle.** Strict role-based access, every state change audited, internal notes that can never leak to authors, and live updates both ways.
2. **AI that is useful and safe to depend on.** Classification never blocks ticket creation, every model output is validated, and when the LLM is down the system falls back to keyword rules and policy templates, so admins never lose the ability to work.
3. **Grounded drafts.** Instead of dumping the knowledge base into a prompt, the API computes the facts an agent would look up: the next payout date from the quarterly cycle, whether the balance clears ₹1,000, the book's sales, and its production stage. The model gets those plus the one relevant policy section. That's what makes a draft say "your ₹2,546 is due by 14 Nov" rather than "royalties are paid quarterly".
4. **Reducing tickets, not just answering them.** The author dashboard shows the same payout date and threshold explanation, and the ticket form carries quick answers.

## Trade-offs I made

- **Separate Express API plus Next.js, rather than a single Next.js app.** It's more moving parts, but the REST contract is explicit, testable and documented (OpenAPI), and long-lived SSE connections work naturally. A Next.js rewrite keeps the browser on one origin, so auth stays a first-party httpOnly cookie.
- **SSE over WebSockets.** Updates only flow server to client, and SSE reconnects for free. Events carry only an id and clients refetch over REST, so the real-time path can't bypass access control.
- **Cheap model by default.** Haiku-class models for both tasks, because a person reviews every draft. Models are configurable per task, and Insights shows how often admins keep the AI's category and priority, which is the signal for when to upgrade.
- **Lazy, cached drafts.** Drafts are generated only for tickets someone opens, stored, and regenerated on demand or after the author writes again. It's a little slower on first open, but far cheaper at 1,200+ books a month.
- **Simplicity over infrastructure.** In-memory SSE fan-out, rate limits and background classification are fine for one instance. Each has a clear seam to swap in Redis or a job queue.
- **Deliberately out of scope:** file storage (attachment UI only), registration and password reset, and email notifications.

## Taking it to production

- **Scale out:** Redis pub/sub for SSE, a shared rate-limit store, BullMQ or pg-boss for classification with retries, PgBouncer, and an `updatedAt` index for incremental polling fallbacks.
- **Close the AI loop:** we already log whether a reply used the draft. I'd add the edit distance between draft and sent text, build an evaluation set from real tickets, and gate prompt or model changes on it. I'd also stream drafts to cut perceived latency.
- **Connect real systems:** pull royalty statements, bank-link status and production timestamps from BookLeaf's source of truth, so drafts can state "your bank account isn't linked" instead of asking.
- **Ops maturity:** SLAs per priority with alerts, saved views, canned responses, assignment to teammates, email notifications, and Playwright end-to-end tests in CI.

The guiding rule throughout: the AI drafts and suggests, people decide, and the system keeps working when the AI doesn't.
