// BookLeaf pays royalties quarterly, within 45 days of the quarter ending,
// and only once the author's accumulated balance reaches ₹1,000.
export const PAYOUT_THRESHOLD = 1000;
export const PAYOUT_WINDOW_DAYS = 45;

export interface PayoutSchedule {
  quarterLabel: string; // e.g. "Jul–Sep 2026"
  quarterEnd: Date;
  payoutDueBy: Date;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

// Last day of the quarter that contains `date` (UTC).
function quarterEndOf(year: number, quarter: number) {
  return new Date(Date.UTC(year, quarter * 3 + 3, 0));
}

/**
 * The next royalty payout the author can expect. If the payout window for the
 * quarter that just ended is still open, that's the one; otherwise it's the
 * payout for the current quarter.
 */
export function getNextPayout(today = new Date()): PayoutSchedule {
  const year = today.getUTCFullYear();
  const quarter = Math.floor(today.getUTCMonth() / 3);

  let endedYear = year;
  let endedQuarter = quarter - 1;
  if (endedQuarter < 0) {
    endedQuarter = 3;
    endedYear -= 1;
  }

  let quarterEnd = quarterEndOf(endedYear, endedQuarter);
  let q = endedQuarter;
  if (addDays(quarterEnd, PAYOUT_WINDOW_DAYS) < today) {
    quarterEnd = quarterEndOf(year, quarter);
    q = quarter;
  }

  const startMonth = MONTHS[q * 3];
  const endMonth = MONTHS[q * 3 + 2];
  return {
    quarterLabel: `${startMonth}–${endMonth} ${quarterEnd.getUTCFullYear()}`,
    quarterEnd,
    payoutDueBy: addDays(quarterEnd, PAYOUT_WINDOW_DAYS),
  };
}

export function formatDate(date: Date | null | undefined) {
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatRupees(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}
