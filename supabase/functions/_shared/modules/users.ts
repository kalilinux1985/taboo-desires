import { AppError } from "../core/errors.ts";
import { mutation, query, type QueryCtx } from "../core/functions.ts";
import type { Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { v } from "../core/values.ts";
import {
  getCurrentUserDoc,
  publicSellerName,
  requireUser,
} from "../lib/auth.ts";
import { getPlan } from "../lib/subscription.ts";
import { getCapabilities } from "../lib/access.ts";
import { assertOwnFiles } from "../lib/files.ts";
import { PROFILE_PHOTO_MAX } from "../domain/accounts.ts";
import { getStats, summarize } from "../lib/sellerStats.ts";
import { invalidSellerDetail } from "../domain/sellerDetails.ts";
import { invalidBuyerDetail } from "../domain/buyerDetails.ts";
import { getActivity, getBadges } from "./activity.ts";

const opt = v.optional(v.string());
export const sellerDetailsValidator = v.object({
  country: opt,
  ageRange: opt,
  gender: opt,
  ethnicity: opt,
  bodySize: opt,
  shoeSize: opt,
  showFace: opt,
  occupation: opt,
  tattoos: opt,
  piercings: opt,
  hairColor: opt,
  eyeColor: opt,
  smokes: opt,
  drinks: opt,
  height: opt,
  relationshipStatus: opt,
});
export const buyerDetailsValidator = v.object({
  gender: opt,
  ageRange: opt,
  country: opt,
  lookingFor: v.optional(v.array(v.string(), 20)),
});

/** Creates the user row for a newly signed-in identity (idempotent). */
export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new AppError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }
    // Check first so repeat sign-ins don't write (and don't trigger live-update broadcasts)
    const existing = await getCurrentUserDoc(ctx);
    if (existing) return existing._id;
    // Accounts created before the switch to Supabase Auth are taken over by the
    // first Supabase login whose verified email matches, so nothing is lost.
    if (identity.email && identity.emailVerified) {
      const legacy = await ctx.db.first(
        "users",
        sql`where lower(email) = lower(${identity.email})
              and token_identifier not like 'supabase|%'
            order by created_at`,
      );
      if (legacy) {
        await ctx.db.patch("users", legacy._id, {
          tokenIdentifier: identity.tokenIdentifier,
          ...(legacy.name || !identity.name ? {} : { name: identity.name }),
        });
        return legacy._id;
      }
    }
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name,
      email: identity.email,
      verified: false,
    });
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new AppError({
        code: "UNAUTHENTICATED",
        message: "Called getCurrentUser without authentication present",
      });
    }
    return await getCurrentUserDoc(ctx);
  },
});

/** Compact signed-in user summary for the header account menu. */
export const menu = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    return {
      _id: me._id,
      name: publicSellerName(me),
      email: me.email ?? null,
      accountType: me.accountType ?? null,
      isAdmin: me.role === "admin",
      isPro: (await getPlan(ctx, me._id)) === "pro",
      avatarUrl: me.avatarStorageId
        ? await ctx.storage.getUrl(me.avatarStorageId)
        : null,
    };
  },
});

/** Account type, plan and what the signed-in user is allowed to do. */
export const myAccess = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    const isPro = (await getPlan(ctx, me._id)) === "pro";
    return {
      accountType: me.accountType ?? null,
      isPro,
      isAdmin: me.role === "admin",
      can: await getCapabilities(ctx, me),
    };
  },
});

/**
 * Picked once after sign-up. Sellers can't switch to buyer later, otherwise
 * they could skip the Pro requirement for messaging and posting.
 */
export const setAccountType = mutation({
  args: { accountType: v.union(v.literal("buyer"), v.literal("seller")) },
  handler: async (ctx, { accountType }) => {
    const user = await requireUser(ctx);
    if (user.accountType === accountType) return null;
    if (user.accountType === "seller" && user.role !== "admin") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Seller accounts can't switch back to buyer",
      });
    }
    await ctx.db.patch("users", user._id, { accountType });
    return null;
  },
});

async function listProfilePhotos(ctx: QueryCtx, userId: Id<"users">) {
  const rows = await ctx.db.select(
    "profilePhotos",
    sql`where user_id = ${userId}::uuid order by created_at, id limit ${PROFILE_PHOTO_MAX}`,
  );
  const urls = await Promise.all(
    rows.map((r) => ctx.storage.getUrl(r.storageId)),
  );
  return rows.flatMap((r, i) => {
    const url = urls[i];
    return url ? [{ _id: r._id, url }] : [];
  });
}

/** Public shop profile, safe to show to anyone (no email). */
export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get("users", userId);
    if (!user) return null;
    const me = await getCurrentUserDoc(ctx);
    return {
      _id: user._id,
      name: publicSellerName(user),
      bio: user.bio ?? null,
      location: user.location ?? null,
      memberSince: user._creationTime,
      isMe: me?._id === user._id,
      isPro: (await getPlan(ctx, user._id)) === "pro",
      verified: !!user.verified,
      accountType: user.accountType ?? null,
      avatarUrl: user.avatarStorageId
        ? await ctx.storage.getUrl(user.avatarStorageId)
        : null,
      photos: await listProfilePhotos(ctx, user._id),
      stats: summarize(await getStats(ctx, user._id)),
      sellerDetails:
        user.accountType === "buyer" ? {} : (user.sellerDetails ?? {}),
      buyerDetails:
        user.accountType === "buyer" ? (user.buyerDetails ?? {}) : {},
      counts: await profileCounts(ctx, user._id),
      activity: await getActivity(ctx, user._id),
      badges: await getBadges(ctx, user),
    };
  },
});

async function profileCounts(ctx: QueryCtx, userId: Id<"users">) {
  ctx.db.touch("listings", "follows");
  const [row] = await ctx.db.rows(sql`
    select
      (select count(*)::int from public.listings
        where seller_id = ${userId}::uuid and status = 'active' and paywall is null) as listings,
      (select count(*)::int from public.listings
        where seller_id = ${userId}::uuid and status = 'active' and paywall is not null) as instant,
      (select count(*)::int from public.follows where follower_id = ${userId}::uuid) as following`);
  return {
    listings: Number(row.listings),
    instantContent: Number(row.instant),
    following: Number(row.following),
  };
}

/** Sellers only. Empty values clear the answer. */
export const updateSellerDetails = mutation({
  args: { details: sellerDetailsValidator },
  handler: async (ctx, { details }) => {
    const user = await requireUser(ctx);
    if (user.accountType !== "seller" && user.role !== "admin") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Only sellers have these profile details",
      });
    }
    const problem = invalidSellerDetail(details);
    if (problem) throw new AppError({ code: "BAD_REQUEST", message: problem });
    await ctx.db.patch("users", user._id, { sellerDetails: details });
    return null;
  },
});

/** Buyers only. Empty values clear the answer. */
export const updateBuyerDetails = mutation({
  args: { details: buyerDetailsValidator },
  handler: async (ctx, { details }) => {
    const user = await requireUser(ctx);
    if (user.accountType !== "buyer") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Only buyers have these profile details",
      });
    }
    const problem = invalidBuyerDetail(details);
    if (problem) throw new AppError({ code: "BAD_REQUEST", message: problem });
    await ctx.db.patch("users", user._id, { buyerDetails: details });
    return null;
  },
});

export const updateProfile = mutation({
  args: {
    shopName: v.string(),
    bio: v.string(),
    location: v.string(),
    // undefined = keep current picture, null = remove it, id = replace it
    avatarStorageId: v.optional(v.union(v.storageId(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (
      args.shopName.length > 40 ||
      args.bio.length > 300 ||
      args.location.length > 60
    ) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Profile fields are too long",
      });
    }
    const avatarChanged =
      args.avatarStorageId !== undefined &&
      args.avatarStorageId !== user.avatarStorageId;
    if (avatarChanged && args.avatarStorageId)
      assertOwnFiles([args.avatarStorageId], user._id, "public");
    // Free up the old picture file when it's replaced or removed
    if (avatarChanged && user.avatarStorageId) {
      ctx.storage.delete(user.avatarStorageId);
    }
    await ctx.db.patch("users", user._id, {
      shopName: args.shopName.trim() || undefined,
      bio: args.bio.trim() || undefined,
      location: args.location.trim() || undefined,
      ...(avatarChanged
        ? { avatarStorageId: args.avatarStorageId ?? undefined }
        : {}),
    });
    return null;
  },
});

export const addProfilePhoto = mutation({
  args: { storageId: v.storageId() },
  handler: async (ctx, { storageId }) => {
    const user = await requireUser(ctx);
    assertOwnFiles([storageId], user._id, "public");
    const count = Number(
      await ctx.db.scalar(
        sql`select count(*)::int from public.profile_photos where user_id = ${user._id}::uuid`,
      ),
    );
    if (count >= PROFILE_PHOTO_MAX) {
      ctx.storage.delete(storageId);
      throw new AppError({
        code: "FORBIDDEN",
        message: `You can have up to ${PROFILE_PHOTO_MAX} profile photos`,
      });
    }
    return await ctx.db.insert("profilePhotos", {
      userId: user._id,
      storageId,
    });
  },
});

export const removeProfilePhoto = mutation({
  args: { photoId: v.id("profilePhotos") },
  handler: async (ctx, { photoId }) => {
    const user = await requireUser(ctx);
    const photo = await ctx.db.get("profilePhotos", photoId);
    if (!photo) return null;
    if (photo.userId !== user._id)
      throw new AppError({ code: "FORBIDDEN", message: "Not your photo" });
    ctx.storage.delete(photo.storageId);
    await ctx.db.delete("profilePhotos", photoId);
    return null;
  },
});

/** Sellers whose shop name (or name) matches, for the search box. Buyers stay anonymous. */
export const search = query({
  args: { search: v.string() },
  handler: async (ctx, { search: text }) => {
    const term = text.trim().slice(0, 60);
    if (term.length < 2) return [];
    // Match anywhere in the name; % and _ typed by the user are literal
    const pattern = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const rows = await ctx.db.rows(sql`
      select id, coalesce(nullif(shop_name, ''), name) as display_name,
             avatar_storage_id, verified
        from public.users
       where account_type = 'seller'
         and coalesce(nullif(shop_name, ''), name) ilike ${pattern}
       order by verified desc, created_at desc
       limit 8`);
    return await Promise.all(
      rows.map(async (r) => ({
        _id: r.id as Id<"users">,
        name: r.display_name as string,
        verified: !!r.verified,
        avatarUrl: r.avatar_storage_id
          ? await ctx.storage.getUrl(r.avatar_storage_id as Id<"_storage">)
          : null,
      })),
    );
  },
});
