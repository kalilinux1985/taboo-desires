import { AppError } from "../core/errors.ts";
import { mutation } from "../core/functions.ts";
import type { Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { v } from "../core/values.ts";
import { requireUser } from "../lib/auth.ts";

/**
 * Permanently deletes the signed-in user's account in one transaction.
 *
 * Counters on other people's content (comment/like/reply counts, seller
 * ratings and follower counts) are corrected first, then the user row is
 * deleted and foreign keys cascade to everything they owned: listings (with
 * auctions, unlocks, favorites, feed posts), posts, comments, likes,
 * conversations and messages, reviews, follows, custom
 * requests, subscriptions, verification, stats and presence. Their bids stay
 * on auctions anonymously. Uploaded files are deleted after commit.
 */
export const deleteMyAccount = mutation({
  args: { confirmation: v.string() },
  handler: async (ctx, { confirmation }) => {
    const user = await requireUser(ctx);
    if (confirmation.trim().toUpperCase() !== "DELETE") {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Type DELETE to confirm",
      });
    }
    if (user.role === "admin") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Admin accounts can't be deleted from Settings",
      });
    }
    const id = user._id;

    // Every file this user uploaded and still has attached
    const files = await ctx.db.rows(sql`
      select unnest(image_ids) as storage_id from public.listings where seller_id = ${id}::uuid
      union all
      select m ->> 'storageId' from public.listings, jsonb_array_elements(paywall -> 'media') m
       where seller_id = ${id}::uuid and paywall is not null
      union all
      select unnest(image_ids) from public.posts where author_id = ${id}::uuid
      union all
      select storage_id from public.profile_photos where user_id = ${id}::uuid
      union all
      select photo_storage_id from public.verifications where user_id = ${id}::uuid and photo_storage_id is not null`);
    ctx.storage.delete(user.avatarStorageId);
    for (const f of files) ctx.storage.delete(f.storage_id as Id<"_storage">);

    // Counters on content that survives the deletion
    // Others' replies under this user's comments go with them
    await ctx.db.rows(sql`
      update public.posts p set comment_count = greatest(0, p.comment_count - r.n)
        from (select c.post_id, count(*)::int as n from public.post_comments r
                join public.post_comments c on c.id = r.parent_id
               where c.author_id = ${id}::uuid and r.author_id <> ${id}::uuid
               group by c.post_id) r
       where p.id = r.post_id and p.author_id <> ${id}::uuid`);
    await ctx.db.rows(sql`
      update public.post_comments c set like_count = greatest(0, c.like_count - l.n)
        from (select comment_id, count(*)::int as n from public.post_comment_likes
               where user_id = ${id}::uuid group by comment_id) l
       where c.id = l.comment_id and c.author_id <> ${id}::uuid`);
    await ctx.db.rows(sql`
      update public.post_comments c set reply_count = greatest(0, c.reply_count - r.n)
        from (select parent_id, count(*)::int as n from public.post_comments
               where author_id = ${id}::uuid and parent_id is not null group by parent_id) r
       where c.id = r.parent_id and c.author_id <> ${id}::uuid`);
    await ctx.db.rows(sql`
      update public.posts p set comment_count = greatest(0, p.comment_count - c.n)
        from (select post_id, count(*)::int as n from public.post_comments
               where author_id = ${id}::uuid group by post_id) c
       where p.id = c.post_id and p.author_id <> ${id}::uuid`);
    await ctx.db.rows(sql`
      update public.posts p set like_count = greatest(0, p.like_count - l.n)
        from (select post_id, count(*)::int as n from public.post_likes
               where user_id = ${id}::uuid group by post_id) l
       where p.id = l.post_id and p.author_id <> ${id}::uuid`);
    await ctx.db.rows(sql`
      update public.seller_stats s
         set review_count = greatest(0, s.review_count - r.n),
             rating_sum = greatest(0, s.rating_sum - r.total)
        from (select seller_id, count(*)::int as n, sum(rating)::int as total from public.reviews
               where reviewer_id = ${id}::uuid group by seller_id) r
       where s.seller_id = r.seller_id`);
    await ctx.db.rows(sql`
      update public.seller_stats s set follower_count = greatest(0, s.follower_count - 1)
        from public.follows f
       where f.follower_id = ${id}::uuid and s.seller_id = f.seller_id`);

    await ctx.db.delete("users", id);
    return null;
  },
});
