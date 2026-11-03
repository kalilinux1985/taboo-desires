// Pure plan rules, shared by the backend and the frontend.

export const PRO_PRICE_CENTS = 14_99;

export const PLAN_LIMITS = {
  free: { maxPhotos: 4, auctions: false, lockedContent: false },
  pro: { maxPhotos: 12, auctions: true, lockedContent: true },
} as const;

/** Max photos/videos in one paywalled listing. */
export const LOCKED_MEDIA_MAX = 10;

export type PlanId = keyof typeof PLAN_LIMITS;
export type PlanLimits = (typeof PLAN_LIMITS)[PlanId];

/** How long an admin can switch Pro on for in one approval. */
export const APPROVAL_MONTHS = [1, 3, 6, 12] as const;

export function isAllowedMonths(months: number): boolean {
  return (APPROVAL_MONTHS as readonly number[]).includes(months);
}

type SubLike = { status: string; expiresAt?: string } | null | undefined;

/** A pending renewal keeps Pro until the paid time runs out. */
export function isProActive(sub: SubLike, nowMs: number): boolean {
  return (
    !!sub &&
    (sub.status === "active" || sub.status === "pending") &&
    !!sub.expiresAt &&
    Date.parse(sub.expiresAt) > nowMs
  );
}

/** Adds calendar months, clamping to the last day so Jan 31 + 1 month = Feb 28/29. */
export function addMonthsIso(fromMs: number, months: number): string {
  const d = new Date(fromMs);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString();
}

/** Extending an active plan stacks on its current end; otherwise it starts now. */
export function nextExpiry(
  sub: SubLike,
  months: number,
  nowMs: number,
): string {
  const base =
    isProActive(sub, nowMs) && sub?.expiresAt
      ? Date.parse(sub.expiresAt)
      : nowMs;
  return addMonthsIso(base, months);
}
