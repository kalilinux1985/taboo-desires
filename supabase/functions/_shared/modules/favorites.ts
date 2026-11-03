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
import { toCard } from "../lib/listingCard.ts";

async function findFavorite(
  ctx: QueryCtx,
  userId: Id<"users">,
  listingId: Id<"listings">,
) {
  return await ctx.db.first(
    "favorites",
    sql`where user_id = ${userId}::uuid and listing_id = ${listingId}::uuid`,
  );
}

export const isFavorite = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return false;
    return !!(await findFavorite(ctx, me._id, listingId));
  },
});

export const toggle = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const me = await requireUser(ctx);
    const listing = await ctx.db.get("listings", listingId);
    if (!listing)
      throw new AppError({ code: "NOT_FOUND", message: "Listing not found" });
    if (listing.sellerId === me._id)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "You can't save your own listing",
      });
    const existing = await findFavorite(ctx, me._id, listingId);
    if (existing) {
      await ctx.db.delete("favorites", existing._id);
      return false;
    }
    await ctx.db.insert("favorites", { userId: me._id, listingId });
    return true;
  },
});

/** The signed-in user's saved listings, newest save first. */
export const mine = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const me = await requireUser(ctx);
    const result = await ctx.db.paginate(
      "favorites",
      {
        where: sql`user_id = ${me._id}::uuid`,
        order: [{ column: "created_at", cast: "timestamptz" }],
        direction: "desc",
      },
      paginationOpts,
    );
    const listings = await Promise.all(
      result.page.map((f) => ctx.db.get("listings", f.listingId)),
    );
    // Favorites are deleted with their listing, so a missing one is only a brief race
    const present = listings.filter((l) => l !== null);
    return {
      ...result,
      page: await Promise.all(present.map((l) => toCard(ctx, l))),
    };
  },
});

/** Sellers the signed-in user follows, for the favorites page. */
export const followedSellers = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const follows = await ctx.db.select(
      "follows",
      sql`where follower_id = ${me._id}::uuid order by created_at limit 100`,
    );
    const sellers = await Promise.all(
      follows.map((f) => ctx.db.get("users", f.sellerId)),
    );
    return await Promise.all(
      sellers
        .filter((s) => s !== null)
        .map(async (s) => ({
          _id: s._id,
          name: publicSellerName(s),
          verified: !!s.verified,
          avatarUrl: s.avatarStorageId
            ? await ctx.storage.getUrl(s.avatarStorageId)
            : null,
        })),
    );
  },
});
