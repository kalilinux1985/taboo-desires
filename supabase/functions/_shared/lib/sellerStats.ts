import type { QueryCtx } from "../core/functions.ts";
import type { Doc, Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";

type Delta = {
  followerCount?: number;
  reviewCount?: number;
  ratingSum?: number;
  salesCount?: number;
};

export async function getStats(ctx: QueryCtx, sellerId: Id<"users">) {
  return await ctx.db.first(
    "sellerStats",
    sql`where seller_id = ${sellerId}::uuid`,
  );
}

/** Adds to the seller's counters in one atomic upsert; counters never go below zero. */
export async function bumpStats(
  ctx: QueryCtx,
  sellerId: Id<"users">,
  delta: Delta,
) {
  const f = delta.followerCount ?? 0;
  const r = delta.reviewCount ?? 0;
  const s = delta.ratingSum ?? 0;
  const n = delta.salesCount ?? 0;
  await ctx.db.rows(sql`
    insert into public.seller_stats (seller_id, follower_count, review_count, rating_sum, sales_count)
    values (${sellerId}::uuid, greatest(0, ${f}::int), greatest(0, ${r}::int), greatest(0, ${s}::int), greatest(0, ${n}::int))
    on conflict (seller_id) do update set
      follower_count = greatest(0, seller_stats.follower_count + ${f}::int),
      review_count = greatest(0, seller_stats.review_count + ${r}::int),
      rating_sum = greatest(0, seller_stats.rating_sum + ${s}::int),
      sales_count = greatest(0, seller_stats.sales_count + ${n}::int)`);
}

export function summarize(stats: Doc<"sellerStats"> | null) {
  const reviewCount = stats?.reviewCount ?? 0;
  const ratingSum = stats?.ratingSum ?? 0;
  return {
    followerCount: stats?.followerCount ?? 0,
    salesCount: stats?.salesCount ?? 0,
    reviewCount,
    rating: reviewCount
      ? Math.round((ratingSum / reviewCount) * 10) / 10
      : null,
  };
}

/** Buyers who messaged the seller or bought paywalled content from them can review. */
export async function canReview(
  ctx: QueryCtx,
  reviewerId: Id<"users">,
  sellerId: Id<"users">,
): Promise<boolean> {
  if (reviewerId === sellerId) return false;
  ctx.db.touch("conversations", "unlocks");
  const found = await ctx.db.scalar(sql`
    select exists (
      select 1 from public.conversations where buyer_id = ${reviewerId}::uuid and seller_id = ${sellerId}::uuid
    ) or exists (
      select 1 from public.unlocks
       where buyer_id = ${reviewerId}::uuid and seller_id = ${sellerId}::uuid and status = 'granted'
    )`);
  return found === true || found === "t";
}
