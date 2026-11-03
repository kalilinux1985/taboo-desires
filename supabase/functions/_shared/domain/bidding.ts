// Pure bidding rules shared by the backend and the frontend (no Convex imports here).

/** Bids placed in the final 2 minutes push the end time out, so nobody wins by sniping. */
export const ANTI_SNIPE_MS = 2 * 60 * 1000;

export const MAX_BID_CENTS = 100_000_00;

export const AUCTION_DURATIONS = [
  { hours: 1, label: "1 hour" },
  { hours: 24, label: "1 day" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
] as const;

export type AuctionDurationHours = (typeof AUCTION_DURATIONS)[number]["hours"];

export function isAllowedDuration(
  hours: number,
): hours is AuctionDurationHours {
  return AUCTION_DURATIONS.some((d) => d.hours === hours);
}

/** Minimum raise over the current bid, stepped by price tier. */
export function bidIncrementCents(currentCents: number): number {
  if (currentCents < 100_00) return 1_00;
  if (currentCents < 500_00) return 5_00;
  if (currentCents < 1_000_00) return 10_00;
  return 25_00;
}

/** The first bid can match the starting price; later bids must beat it by the increment. */
export function minNextBidCents(auction: {
  currentBidCents: number;
  bidCount: number;
}): number {
  return auction.bidCount === 0
    ? auction.currentBidCents
    : auction.currentBidCents + bidIncrementCents(auction.currentBidCents);
}

/** New end time after a bid lands at `nowMs`. */
export function extendedEndsAtMs(endsAtMs: number, nowMs: number): number {
  return endsAtMs - nowMs < ANTI_SNIPE_MS ? nowMs + ANTI_SNIPE_MS : endsAtMs;
}

/** "J***n" style label so bid history doesn't expose full names. */
export function maskName(name: string): string {
  const clean = name.trim();
  if (clean.length <= 2) return `${clean.slice(0, 1) || "?"}***`;
  return `${clean.slice(0, 1)}***${clean.slice(-1)}`;
}
