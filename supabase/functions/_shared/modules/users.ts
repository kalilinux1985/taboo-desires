import { AppError } from "../core/errors.ts";
import { mutation, query, type QueryCtx } from "../core/functions.ts";
import type { Id } from "../core/schema.ts";
import { empty, raw, sql } from "../core/sql.ts";
import { paginationOptsValidator, v } from "../core/values.ts";
import {
  getCurrentUserDoc,
  publicSellerName,
  requireUser,
} from "../lib/auth.ts";
import { isAgeVerified } from "../domain/age.ts";
import { getPlan } from "../lib/subscription.ts";
import { getCapabilities } from "../lib/access.ts";
import { assertOwnFiles } from "../lib/files.ts";
import { toLikers } from "../lib/posts.ts";
import { BUYER_PHOTO_MAX, PROFILE_PHOTO_PREVIEW } from "../domain/accounts.ts";
import { getStats, summarize } from "../lib/sellerStats.ts";
import { invalidSellerDetail } from "../domain/sellerDetails.ts";
import {
  OFFERINGS,
  PAYMENT_METHODS,
  invalidSetting,
  withDefaults,
  type SellerSettings,
} from "../domain/sellerSettings.ts";
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
  pregnant: opt,
});
export const buyerDetailsValidator = v.object({
  gender: opt,
  ageRange: opt,
  ethnicity: opt,
  bodySize: opt,
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
      ageVerified: false,
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
      ageVerified: isAgeVerified(me.ageVerified),
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

/** Whether a username is free (case-insensitive). Open to signed-out visitors, for the sign-up form. */
export const usernameAvailable = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const wanted = name.trim().toLowerCase();
    if (!wanted) return false;
    ctx.db.touch("users");
    const rows = await ctx.db.rows(sql`
      select 1 from public.users
       where lower(name) = ${wanted} or lower(shop_name) = ${wanted}
       limit 1`);
    return rows.length === 0;
  },
});

/**
 * Applies what the sign-up form asked for, once, on a new member's first sign-in:
 * account type, plus country, gender and age group on their profile.
 */
export const finishSignup = mutation({
  args: {
    accountType: v.union(v.literal("buyer"), v.literal("seller")),
    country: opt,
    gender: opt,
    ageRange: opt,
  },
  handler: async (ctx, { accountType, country, gender, ageRange }) => {
    const user = await requireUser(ctx);
    if (user.accountType) return null; // already set up: never overwrite
    const details = { country, gender, ageRange };
    const problem =
      accountType === "buyer" ? invalidBuyerDetail(details) : invalidSellerDetail(details);
    if (problem) throw new AppError({ code: "BAD_REQUEST", message: problem });
    const clean = Object.fromEntries(Object.entries(details).filter(([, x]) => x));
    await ctx.db.patch("users", user._id, {
      accountType,
      ...(country && !user.location ? { location: country } : {}),
      ...(accountType === "buyer"
        ? { buyerDetails: { ...user.buyerDetails, ...clean } }
        : { sellerDetails: { ...user.sellerDetails, ...clean } }),
    });
    return null;
  },
});

type ProfilePhotoRow = { _id: Id<"profilePhotos">; storageId: Id<"_storage"> };

async function withPhotoUrls(ctx: QueryCtx, rows: ProfilePhotoRow[]) {
  const urls = await Promise.all(
    rows.map((r) => ctx.storage.getUrl(r.storageId)),
  );
  return rows.flatMap((r, i) => {
    const url = urls[i];
    return url ? [{ _id: r._id, url }] : [];
  });
}

/** The newest few profile photos, for the profile's Overview. */
async function listProfilePhotos(ctx: QueryCtx, userId: Id<"users">) {
  const rows = await ctx.db.select(
    "profilePhotos",
    sql`where user_id = ${userId}::uuid order by created_at desc, id desc limit ${PROFILE_PHOTO_PREVIEW}`,
  );
  return withPhotoUrls(ctx, rows);
}

/**
 * Everything a member has uploaded outside their listings, newest first, a page
 * at a time: profile photos and the photos on their activity posts. Listing and
 * Instant Content photos are left out. `photoId` is set on profile photos, the
 * only ones removed from here (post photos go when the post is deleted).
 */
/** Profile photos plus pictures from the member's posts (not in an album), newest first. */
function photosSource(userId: Id<"users">, albumId: Id<"photoAlbums"> | undefined, isAdmin: boolean) {
  return sql`
        select pp.id::text as source_id, pp.storage_id, pp.created_at, 0::int as ord, true as own,
               pp.description as caption,
               (select count(*) from public.photo_likes l where l.photo_id = pp.id)::int as likes,
               (select count(*) from public.photo_comments c where c.photo_id = pp.id)::int as comments
          from public.profile_photos pp
         where pp.user_id = ${userId}::uuid${albumId ? sql` and pp.album_id = ${albumId}::uuid` : empty}
        union all
        select p.id::text, t.img, p.created_at, t.ord::int, false,
               p.body, p.like_count, p.comment_count
          from public.posts p
         cross join lateral unnest(p.image_ids) with ordinality as t(img, ord)
         where p.author_id = ${userId}::uuid and p.kind <> 'listing'${albumId ? sql` and false` : empty}${isAdmin ? empty : sql` and not p.hidden`}`;
}

export const photosByUser = query({
  args: { userId: v.id("users"), albumId: v.optional(v.id("photoAlbums")), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { userId, albumId, paginationOpts }) => {
    const limit = Math.min(Math.max(1, Math.floor(paginationOpts.numItems)), 100);
    const cursor = paginationOpts.cursor;
    const offset = cursor?.startsWith("o:") ? Math.max(0, Number(cursor.slice(2)) || 0) : 0;
    const { page, more } = await loadPhotos(ctx, userId, albumId, offset, limit);
    return { page, isDone: !more, continueCursor: `o:${offset + page.length}` };
  },
});

/** One numbered page of a member's photos, with the total, for the Photos tab. */
export const photosPage = query({
  args: { userId: v.id("users"), albumId: v.optional(v.id("photoAlbums")), page: v.number() },
  handler: async (ctx, { userId, albumId, page }) => {
    const PAGE_SIZE = 12;
    const me = await getCurrentUserDoc(ctx);
    const total = Number(
      (await ctx.db.scalar(sql`select count(*) from (${photosSource(userId, albumId, me?.role === "admin")}) photos`)) ?? 0,
    );
    const offset = Math.max(0, Math.floor(page)) * PAGE_SIZE;
    const { page: items } = await loadPhotos(ctx, userId, albumId, offset, PAGE_SIZE);
    return { total, pageSize: PAGE_SIZE, items };
  },
});

async function loadPhotos(
  ctx: Parameters<typeof getCurrentUserDoc>[0],
  userId: Id<"users">,
  albumId: Id<"photoAlbums"> | undefined,
  offset: number,
  limit: number,
) {
    ctx.db.touch("profilePhotos", "posts", "photoLikes", "photoComments", "postLikes");
    const me = await getCurrentUserDoc(ctx);
    const rows = await ctx.db.rows(sql`
      select * from (${photosSource(userId, albumId, me?.role === "admin")}) photos
      order by created_at desc, source_id desc, ord
      limit ${limit + 1} offset ${offset}`);
    const pageRows = rows.slice(0, limit);
    const urls = await Promise.all(pageRows.map((r) => ctx.storage.getUrl(String(r.storage_id) as Id<"_storage">)));

    // Who liked each photo (newest few) and whether the viewer did
    const ownIds = [...new Set(pageRows.filter((r) => r.own === true).map((r) => String(r.source_id)))];
    const postIds = [...new Set(pageRows.filter((r) => r.own !== true).map((r) => String(r.source_id)))];
    const likerIds = new Map<string, string[]>();
    const likedByMe = new Set<string>();
    const collect = async (table: "photo_likes" | "post_likes", col: "photo_id" | "post_id", ids: string[]) => {
      if (ids.length === 0) return;
      const found = await ctx.db.rows(sql`
        select ${raw(col)}::text as target, user_id::text as user_id from (
          select ${raw(col)}, user_id,
                 row_number() over (partition by ${raw(col)} order by created_at desc, id desc) as n
            from public.${raw(table)}
           where ${raw(col)} = any(${ids}::uuid[])
        ) ranked where n <= ${PHOTO_LIKERS_SHOWN}::int
        order by target, n`);
      for (const r of found)
        likerIds.set(String(r.target), [...(likerIds.get(String(r.target)) ?? []), String(r.user_id)]);
      if (me) {
        const mine = await ctx.db.rows(sql`
          select ${raw(col)}::text as target from public.${raw(table)}
           where user_id = ${me._id}::uuid and ${raw(col)} = any(${ids}::uuid[])`);
        for (const r of mine) likedByMe.add(String(r.target));
      }
    };
    await Promise.all([
      collect("photo_likes", "photo_id", ownIds),
      collect("post_likes", "post_id", postIds),
    ]);
    const allLikers = [...new Set([...likerIds.values()].flat())];
    const likerDocs = new Map(
      (await toLikers(ctx, allLikers)).map((l) => [String(l._id), l]),
    );

    const page = pageRows.flatMap((r, i) => {
      const url = urls[i];
      if (!url) return [];
      const own = r.own === true;
      const sourceId = String(r.source_id);
      return [
        {
          _id: `${own ? "profile" : "post"}:${sourceId}:${Number(r.ord)}`,
          url,
          photoId: own ? (sourceId as Id<"profilePhotos">) : null,
          postId: own ? null : (sourceId as Id<"posts">),
          caption: r.caption ? String(r.caption) : "",
          likeCount: Number(r.likes ?? 0),
          commentCount: Number(r.comments ?? 0),
          likedByMe: likedByMe.has(sourceId),
          likers: (likerIds.get(sourceId) ?? []).flatMap((id) => {
            const l = likerDocs.get(id);
            return l ? [l] : [];
          }),
        },
      ];
    });
    return { page, more: rows.length > limit };
}

const PHOTO_LIKERS_SHOWN = 6;

/** A private profile is visible only to its owner and admins. */
const isPrivateProfile = (user: { settings?: SellerSettings }) => user.settings?.profilePrivate === "yes";
const canViewProfile = (user: { _id: Id<"users">; settings?: SellerSettings }, me: { _id: Id<"users">; role?: string } | null) =>
  !isPrivateProfile(user) || me?._id === user._id || me?.role === "admin";

/** Whether the profile is private to the viewer, with just enough to show a "private" page. */
export const profileAccess = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get("users", userId);
    if (!user) return null;
    const me = await getCurrentUserDoc(ctx);
    if (canViewProfile(user, me)) return { locked: false as const, name: null, avatarUrl: null };
    return {
      locked: true as const,
      name: publicSellerName(user),
      avatarUrl: user.avatarStorageId ? await ctx.storage.getUrl(user.avatarStorageId) : null,
    };
  },
});

/** Any member can make their own profile private or visible to everyone. */
export const setProfilePrivate = mutation({
  args: { isPrivate: v.boolean() },
  handler: async (ctx, { isPrivate }) => {
    const user = await requireUser(ctx);
    await ctx.db.patch("users", user._id, {
      settings: { ...user.settings, profilePrivate: isPrivate ? "yes" : "no" },
    });
    return null;
  },
});

/** Public shop profile, safe to show to anyone (no email). Null when missing or private to the viewer. */
export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get("users", userId);
    if (!user) return null;
    const me = await getCurrentUserDoc(ctx);
    if (!canViewProfile(user, me)) return null;
    return {
      isPrivate: isPrivateProfile(user),
      _id: user._id,
      name: publicSellerName(user),
      username: user.username ?? null,
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
      // Shown in the profile's About section
      paymentMethods: user.accountType === "buyer" ? [] : (user.settings?.paymentMethods ?? []),
      offerings: user.accountType === "buyer" ? [] : (user.settings?.offerings ?? []),
      counts: await profileCounts(ctx, user._id),
      // Buyers aren't rated; their profile shows the reviews they've written
      reviewsWritten:
        user.accountType === "buyer" ? await reviewsWritten(ctx, user._id) : null,
      activity: await getActivity(ctx, user._id),
      badges: await getBadges(ctx, user),
    };
  },
});

/** How many reviews a member has left, and the average stars they gave. */
async function reviewsWritten(ctx: QueryCtx, userId: Id<"users">) {
  ctx.db.touch("reviews");
  const [row] = await ctx.db.rows(sql`
    select count(*)::int as n, coalesce(avg(rating), 0)::float8 as average
    from public.reviews where reviewer_id = ${userId}::uuid`);
  const count = Number(row.n);
  return { count, average: count ? Math.round(Number(row.average) * 10) / 10 : 0 };
}

async function profileCounts(ctx: QueryCtx, userId: Id<"users">) {
  ctx.db.touch("listings", "follows", "profilePhotos", "posts");
  const [row] = await ctx.db.rows(sql`
    select
      (select count(*)::int from public.listings
        where seller_id = ${userId}::uuid and status = 'active' and paywall is null) as listings,
      (select count(*)::int from public.listings
        where seller_id = ${userId}::uuid and status = 'active' and paywall is not null) as instant,
      (select count(*)::int from public.follows where follower_id = ${userId}::uuid and status = 'accepted') as following,
      (select count(*)::int from public.profile_photos where user_id = ${userId}::uuid)
        + (select coalesce(sum(cardinality(image_ids)), 0)::int from public.posts
            where author_id = ${userId}::uuid and kind <> 'listing' and not hidden) as photos,
      (select count(*)::int from public.profile_photos where user_id = ${userId}::uuid) as profile_photos`);
  return {
    listings: Number(row.listings),
    instantContent: Number(row.instant),
    following: Number(row.following),
    /** Profile photos plus photos on activity posts (the Photos tab) */
    photos: Number(row.photos),
    /** Profile photos only (the buyer limit counts these) */
    profilePhotos: Number(row.profile_photos),
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

const settingsValidator = v.object({
  profilePrivate: opt,
  siteVisibility: opt,
  emailNotifications: opt,
  marketingEmails: opt,
  webPush: opt,
  messagesFrom: opt,
  socialFeature: opt,
  paymentMethods: v.optional(v.array(v.string(), PAYMENT_METHODS.length)),
  offerings: v.optional(v.array(v.string(), OFFERINGS.length)),
});

/** The signed-in seller's settings, defaults filled in. */
export const mySettings = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    return me ? withDefaults(me.settings) : null;
  },
});

/** Saves the given settings; anything not sent keeps its current value. */
export const updateSettings = mutation({
  args: { settings: settingsValidator },
  handler: async (ctx, { settings }) => {
    const user = await requireUser(ctx);
    if (user.accountType !== "seller" && user.role !== "admin") {
      throw new AppError({ code: "FORBIDDEN", message: "These settings are for sellers" });
    }
    const problem = invalidSetting(settings);
    if (problem) throw new AppError({ code: "BAD_REQUEST", message: problem });
    const unique = (list?: string[]) => (list ? [...new Set(list)] : undefined);
    const next: SellerSettings = { ...user.settings };
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) (next as Record<string, unknown>)[key] = value;
    }
    next.paymentMethods = unique(next.paymentMethods);
    next.offerings = unique(next.offerings);
    await ctx.db.patch("users", user._id, { settings: next });
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
  args: {
    storageId: v.storageId(),
    description: v.optional(v.string()),
    albumId: v.optional(v.id("photoAlbums")),
  },
  handler: async (ctx, { storageId, description, albumId }) => {
    const user = await requireUser(ctx);
    assertOwnFiles([storageId], user._id, "public");
    const caption = description?.trim() ?? "";
    if (caption.length > 300) {
      ctx.storage.delete(storageId);
      throw new AppError({ code: "BAD_REQUEST", message: "Descriptions are up to 300 characters" });
    }
    if (albumId) {
      const album = await ctx.db.get("photoAlbums", albumId);
      if (!album || album.userId !== user._id) {
        ctx.storage.delete(storageId);
        throw new AppError({ code: "NOT_FOUND", message: "Album not found" });
      }
    }
    // Sellers (and admins) can add as many as they like; buyers keep a small limit
    if (user.accountType !== "seller" && user.role !== "admin") {
      const count = Number(
        await ctx.db.scalar(
          sql`select count(*)::int from public.profile_photos where user_id = ${user._id}::uuid`,
        ),
      );
      if (count >= BUYER_PHOTO_MAX) {
        ctx.storage.delete(storageId);
        throw new AppError({
          code: "FORBIDDEN",
          message: `Buyers can have up to ${BUYER_PHOTO_MAX} profile photos`,
        });
      }
    }
    return await ctx.db.insert("profilePhotos", {
      userId: user._id,
      storageId,
      ...(caption ? { description: caption } : {}),
      ...(albumId ? { albumId } : {}),
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

/**
 * Member directory for the Find Sellers / Find Buyers pages: newest members of
 * one account type, optionally filtered by name. Hides the signed-in member and
 * anyone blocked either way.
 */
export const findMembers = query({
  args: { accountType: v.union(v.literal("seller"), v.literal("buyer")), search: opt },
  handler: async (ctx, { accountType, search: text }) => {
    const me = await getCurrentUserDoc(ctx);
    const term = (text ?? "").trim().slice(0, 60);
    const pattern = term ? `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
    const rows = await ctx.db.rows(sql`
      select u.id, coalesce(nullif(u.shop_name, ''), u.name) as display_name,
             u.avatar_storage_id, u.verified
        from public.users u
       where u.account_type = ${accountType}
         and coalesce(nullif(u.shop_name, ''), u.name) is not null
         ${pattern ? sql`and coalesce(nullif(u.shop_name, ''), u.name) ilike ${pattern}` : empty}
         ${
           me
             ? sql`and u.id <> ${me._id}::uuid
                   and not exists (
                     select 1 from public.blocks b
                      where (b.blocker_id = ${me._id}::uuid and b.blocked_id = u.id)
                         or (b.blocker_id = u.id and b.blocked_id = ${me._id}::uuid))`
             : empty
         }
       order by u.verified desc, u.created_at desc
       limit 48`);
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

/** The member with this username (the profile address /username), or null. */
export const idByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const u = await ctx.db.first("users", sql`where username = ${username.toLowerCase().slice(0, 60)}`);
    return u?._id ?? null;
  },
});

/** Sellers with a picture, best first (sales, then rating and reviews): the home page's avatar grid. */
export const topSellers = query({
  args: {},
  handler: async (ctx) => {
    ctx.db.touch("users", "sellerStats");
    const rows = await ctx.db.rows(sql`
      select u.id, u.username, u.avatar_storage_id
        from public.users u
        left join public.seller_stats s on s.seller_id = u.id
       where u.account_type = 'seller'
         and u.avatar_storage_id is not null
         and coalesce(u.settings->>'profilePrivate', 'no') <> 'yes'
       order by coalesce(s.sales_count, 0) desc,
                coalesce(s.rating_sum::float / nullif(s.review_count, 0), 0) desc,
                coalesce(s.review_count, 0) desc,
                coalesce(s.follower_count, 0) desc,
                u.created_at
       limit 9`);
    const out = await Promise.all(
      rows.map(async (r) => ({
        _id: r.id as Id<"users">,
        username: r.username as string,
        avatarUrl: await ctx.storage.getUrl(r.avatar_storage_id as Id<"_storage">),
      })),
    );
    return out.filter((r) => r.avatarUrl);
  },
});
