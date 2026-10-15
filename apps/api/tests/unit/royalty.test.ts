import { describe, expect, it } from "vitest";
import { getNextPayout } from "../../src/lib/royalty";

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

describe("getNextPayout", () => {
  it("points at the quarter that just ended while its 45-day window is open", () => {
    const payout = getNextPayout(day("2026-10-15"));
    expect(payout.quarterLabel).toBe("Jul–Sep 2026");
    expect(isoDate(payout.payoutDueBy)).toBe("2026-11-14");
  });

  it("moves to the current quarter once the window has passed", () => {
    const payout = getNextPayout(day("2026-11-20"));
    expect(payout.quarterLabel).toBe("Oct–Dec 2026");
    expect(isoDate(payout.payoutDueBy)).toBe("2027-02-14");
  });

  it("handles the year boundary", () => {
    const payout = getNextPayout(day("2026-01-10"));
    expect(payout.quarterLabel).toBe("Oct–Dec 2025");
    expect(isoDate(payout.payoutDueBy)).toBe("2026-02-14");
  });
});
