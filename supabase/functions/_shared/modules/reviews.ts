import { AppError } from "../core/errors.ts";
import { mutation, query, type QueryCtx } from "../core/functions.ts";
import type { Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { paginationOptsValidator, v } from "../core/values.ts";
import {
  getCurrentUserDoc,
  publicSellerName,
  requireUser,
} from "../lib/auth.ts";
import { bumpStats, canReview } from "../lib/sellerStats.ts";
import { getCapabilities, requireCapability } from "../lib/access.ts";

const BODY_MAX = 1000;

async function findReview(
  ctx: QueryCtx,
  sellerId: Id<"users">,
  reviewerId: Id<"users">,
) {
  return await ctx.db.first(
    "reviews",
    sql`where seller_id = ${sellerId}::uuid and reviewer_id = ${reviewerId}::uuid`,
  );
}

export const listForSeller = query({
  args: { sellerId: v.id("users"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { sellerId, paginationOpts }) => {
    const result = await ctx.db.paginate(
      "reviews",
      {
        where: sql`seller_id = ${sellerId}::uuid`,
        order: [{ column: "created_at", cast: "timestamptz" }],
        direction: "desc",
      },
      paginationOpts,
    );
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (r) => {
          const reviewer = await ctx.db.get("users", r.reviewerId);
          return {
            _id: r._id,
            rating: r.rating,
            body: r.body,
            updatedAt: r.updatedAt,
            reviewer: reviewer
              ? {
                  _id: reviewer._id,
                  name: publicSellerName(reviewer),
                  avatarUrl: reviewer.avatarStorageId
                    ? await ctx.storage.getUrl(reviewer.avatarStorageId)
                    : null,
                }
              : null,
          };
        }),
      ),
    };
  },
});

/** Reviews a member has written, shown on buyer profiles. */
export const listByReviewer = query({
  args: { reviewerId: v.id("users"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { reviewerId, paginationOpts }) => {
    const result = await ctx.db.paginate(
      "reviews",
      {
        where: sql`reviewer_id = ${reviewerId}::uuid`,
        order: [{ column: "created_at", cast: "timestamptz" }],
        direction: "desc",
      },
      paginationOpts,
    );
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (r) => {
          const seller = await ctx.db.get("users", r.sellerId);
          return {
            _id: r._id,
            rating: r.rating,
            body: r.body,
            updatedAt: r.updatedAt,
            seller: seller
              ? {
                  _id: seller._id,
                  name: publicSellerName(seller),
                  avatarUrl: seller.avatarStorageId
                    ? await ctx.storage.getUrl(seller.avatarStorageId)
                    : null,
                }
              : null,
          };
        }),
      ),
    };
  },
});

/** Whether the signed-in user may review this seller, plus their existing review. */
export const myReview = query({
  args: { sellerId: v.id("users") },
  handler: async (ctx, { sellerId }) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    const [can, eligible, review] = await Promise.all([
      getCapabilities(ctx, me),
      canReview(ctx, me._id, sellerId),
      findReview(ctx, sellerId, me._id),
    ]);
    return {
      eligible: can.buy && eligible,
      review: review ? { rating: review.rating, body: review.body } : null,
    };
  },
});

export const save = mutation({
  args: { sellerId: v.id("users"), rating: v.number(), body: v.string() },
  handler: async (ctx, { sellerId, rating, body }) => {
    const me = await requireCapability(ctx, "buy");
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Pick a rating from 1 to 5 stars",
      });
    const text = body.trim();
    if (text.length > BODY_MAX)
      throw new AppError({
        code: "BAD_REQUEST",
        message: `Reviews can be up to ${BODY_MAX} characters`,
      });
    if (!(await canReview(ctx, me._id, sellerId)))
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "You can review a seller after messaging them or buying from them",
      });
    const existing = await findReview(ctx, sellerId, me._id);
    const updatedAt = new Date(ctx.now()).toISOString();
    if (existing) {
      await ctx.db.patch("reviews", existing._id, {
        rating,
        body: text,
        updatedAt,
      });
      await bumpStats(ctx, sellerId, { ratingSum: rating - existing.rating });
    } else {
      await ctx.db.insert("reviews", {
        sellerId,
        reviewerId: me._id,
        rating,
        body: text,
        updatedAt,
      });
      await bumpStats(ctx, sellerId, { reviewCount: 1, ratingSum: rating });
    }
    return null;
  },
});

export const remove = mutation({
  args: { sellerId: v.id("users") },
  handler: async (ctx, { sellerId }) => {
    const me = await requireUser(ctx);
    const existing = await findReview(ctx, sellerId, me._id);
    if (!existing) return null;
    await ctx.db.delete("reviews", existing._id);
    await bumpStats(ctx, sellerId, {
      reviewCount: -1,
      ratingSum: -existing.rating,
    });
    return null;
  },
});
