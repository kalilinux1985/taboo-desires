import { AppError } from "../core/errors.ts";
import { mutation, query, type QueryCtx } from "../core/functions.ts";
import type { Doc, Id } from "../core/schema.ts";
import { sql, empty, type Sql } from "../core/sql.ts";
import {
  paginationOptsValidator,
  v,
  type PaginationOptions,
} from "../core/values.ts";
import {
  CATEGORIES,
  CONDITIONS,
  LISTING_STATUSES,
  MEDIA_KINDS,
  SALE_TYPES,
} from "../domain/enums.ts";
import {
  getCurrentUserDoc,
  publicSellerName,
  requireUser,
} from "../lib/auth.ts";
import { createAuction, getAuctionByListing } from "../lib/auctionState.ts";
import { toCard } from "../lib/listingCard.ts";
import { isAllowedDuration } from "../domain/bidding.ts";
import { getPlan } from "../lib/subscription.ts";
import { requireCapability } from "../lib/access.ts";
import { PLAN_LIMITS } from "../domain/plans.ts";
import {
  canViewLocked,
  getUnlock,
  validateLockedMedia,
  type LockedMedia,
} from "../lib/lockedContent.ts";
import { getStats, summarize, bumpStats } from "../lib/sellerStats.ts";
import { deleteListingCascade } from "../lib/listingDelete.ts";
import { insertListingPost } from "../lib/posts.ts";
import { assertOwnFiles } from "../lib/files.ts";
import { SELLER_DETAIL_FIELDS } from "../domain/sellerDetails.ts";

const MAX_PRICE_CENTS = 100_000_00;

export const categoryValidator = v.union(
  ...CATEGORIES.map((c) => v.literal(c)),
);
export const conditionValidator = v.union(
  ...CONDITIONS.map((c) => v.literal(c)),
);
export const listingStatusValidator = v.union(
  ...LISTING_STATUSES.map((s) => v.literal(s)),
);
export const saleTypeValidator = v.union(
  ...SALE_TYPES.map((s) => v.literal(s)),
);
export const mediaKindValidator = v.union(
  ...MEDIA_KINDS.map((k) => v.literal(k)),
);

const listingFields = {
  title: v.string(),
  description: v.string(),
  category: categoryValidator,
  brand: v.string(),
  size: v.string(),
  condition: conditionValidator,
  priceCents: v.number(),
  imageIds: v.array(v.storageId(), 20),
  // Paywalled listing: original files; imageIds then hold their blurred previews
  locked: v.optional(
    v.array(
      v.object({ storageId: v.storageId(), kind: mediaKindValidator }),
      20,
    ),
  ),
};

type ListingInput = {
  title: string;
  description: string;
  brand: string;
  size: string;
  priceCents: number;
  imageIds: Id<"_storage">[];
};

function validateListing(input: ListingInput) {
  const bad = (message: string) =>
    new AppError({ code: "BAD_REQUEST", message });
  if (input.title.trim().length < 3 || input.title.length > 80)
    throw bad("Title must be 3-80 characters");
  if (input.description.length > 2000) throw bad("Description is too long");
  if (!input.brand.trim()) throw bad("Brand is required");
  if (!input.size.trim()) throw bad("Size is required");
  if (
    !Number.isInteger(input.priceCents) ||
    input.priceCents < 100 ||
    input.priceCents > MAX_PRICE_CENTS
  )
    throw bad("Price must be between $1 and $100,000");
  if (input.imageIds.length < 1) throw bad("Add at least one photo");
}

/** Free sellers get fewer photos; a downgraded seller can keep (not grow) what they had. */
function checkPhotoLimit(count: number, maxPhotos: number, alreadyHad = 0) {
  if (count > Math.max(maxPhotos, alreadyHad))
    throw new AppError({
      code: "FORBIDDEN",
      message: `Your plan allows up to ${maxPhotos} photos per listing. Upgrade to Pro for more.`,
    });
}

function cleanListing<T extends ListingInput>(input: T): T {
  return {
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    brand: input.brand.trim(),
    size: input.size.trim(),
  };
}

async function requireOwnListing(ctx: QueryCtx, listingId: Id<"listings">) {
  const user = await requireUser(ctx);
  const listing = await ctx.db.get("listings", listingId);
  if (!listing)
    throw new AppError({ code: "NOT_FOUND", message: "Listing not found" });
  if (listing.sellerId !== user._id)
    throw new AppError({ code: "FORBIDDEN", message: "Not your listing" });
  return listing;
}

/**
 * Starting price can only change before the first bid; afterwards the listing
 * price is locked to the live bid. Returns the price to store on the listing.
 */
async function syncAuctionPrice(
  ctx: QueryCtx,
  auction: Doc<"auctions"> | null,
  requestedCents: number,
) {
  if (!auction) return requestedCents;
  if (auction.bidCount > 0) return auction.currentBidCents;
  await ctx.db.patch("auctions", auction._id, {
    startingBidCents: requestedCents,
    currentBidCents: requestedCents,
  });
  return requestedCents;
}

/**
 * Signed upload URL for one file. "private" is for locked originals and
 * verification photos; everything else is "public".
 */
export const generateUploadUrl = mutation({
  args: {
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  },
  handler: async (ctx, { visibility }) => {
    const user = await requireUser(ctx);
    return await ctx.storage.generateUploadUrl(
      user._id,
      visibility ?? "public",
    );
  },
});

/** Turns free text into a prefix-matching full-text query: "black lac" -> black:* & lac:* */
function searchTerms(search: string): string | null {
  const terms = search
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 8);
  return terms.length ? terms.map((t) => `${t}:*`).join(" & ") : null;
}

export const browse = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    category: v.optional(categoryValidator),
    condition: v.optional(conditionValidator),
    sort: v.union(
      v.literal("newest"),
      v.literal("price_asc"),
      v.literal("price_desc"),
    ),
    saleType: v.optional(saleTypeValidator),
    minPriceCents: v.optional(v.number()),
    maxPriceCents: v.optional(v.number()),
    listedWithinDays: v.optional(v.number()),
    verifiedOnly: v.optional(v.boolean()),
    /** Seller profile filters: each listed field must match one of its values. */
    seller: v.optional(
      v.array(
        v.object({ key: v.string(), values: v.array(v.string(), 50) }),
        SELLER_DETAIL_FIELDS.length,
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { category, condition, saleType } = args;
    const filters: Sql[] = [sql`status = 'active'`];
    if (category) filters.push(sql`category = ${category}`);
    if (condition) filters.push(sql`condition = ${condition}`);
    if (saleType) filters.push(sql`sale_type = ${saleType}`);
    if (args.minPriceCents !== undefined)
      filters.push(sql`price_cents >= ${Math.floor(args.minPriceCents)}::int`);
    if (args.maxPriceCents !== undefined)
      filters.push(sql`price_cents < ${Math.ceil(args.maxPriceCents)}::int`);
    if (args.listedWithinDays !== undefined) {
      const days = Math.min(3650, Math.max(1, Math.floor(args.listedWithinDays)));
      filters.push(sql`created_at >= now() - make_interval(days => ${days}::int)`);
    }
    const sellerConditions: Sql[] = [];
    if (args.verifiedOnly) sellerConditions.push(sql`u.verified`);
    for (const { key, values } of args.seller ?? []) {
      const field = SELLER_DETAIL_FIELDS.find((f) => f.key === key);
      if (!field) throw new AppError({ code: "BAD_REQUEST", message: `Unknown filter: ${key}` });
      const allowed = values.filter((x) =>
        (field.options as readonly string[]).includes(x),
      );
      if (allowed.length === 0) continue;
      sellerConditions.push(
        sql`u.seller_details ->> ${key} = any(${allowed}::text[])`,
      );
    }
    if (sellerConditions.length) {
      const match = sellerConditions.reduce((acc, f) => sql`${acc} and ${f}`);
      filters.push(
        sql`exists (select 1 from public.users u where u.id = listings.seller_id and ${match})`,
      );
    }
    const where = filters.reduce(
      (acc, f, i) => (i === 0 ? f : sql`${acc} and ${f}`),
      empty,
    );

    const terms = args.search ? searchTerms(args.search) : null;
    const result = terms
      ? await ctx.db.paginateOffset(
          "listings",
          sql`select * from public.listings
               where ${where} and search @@ to_tsquery('simple', ${terms})
               order by ts_rank(search, to_tsquery('simple', ${terms})) desc, created_at desc, id desc`,
          args.paginationOpts,
        )
      : await browseByIndex(ctx, args.sort, where, args.paginationOpts);

    return {
      ...result,
      page: await Promise.all(result.page.map((l) => toCard(ctx, l))),
    };
  },
});

function browseByIndex(
  ctx: QueryCtx,
  sort: "newest" | "price_asc" | "price_desc",
  where: Sql,
  paginationOpts: PaginationOptions,
) {
  return ctx.db.paginate(
    "listings",
    {
      where,
      order:
        sort === "newest"
          ? [{ column: "created_at", cast: "timestamptz" }]
          : [
              { column: "price_cents", cast: "int" },
              { column: "created_at", cast: "timestamptz" },
            ],
      direction: sort === "price_asc" ? "asc" : "desc",
    },
    paginationOpts,
  );
}

export const get = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const listing = await ctx.db.get("listings", listingId);
    if (!listing) return null;
    const [seller, imageUrls, me, auction, sellerStats] = await Promise.all([
      ctx.db.get("users", listing.sellerId),
      Promise.all(listing.imageIds.map((id) => ctx.storage.getUrl(id))),
      getCurrentUserDoc(ctx),
      getAuctionByListing(ctx, listingId),
      getStats(ctx, listing.sellerId),
    ]);
    const { paywall, ...publicFields } = listing;
    return {
      ...publicFields,
      locked: paywall
        ? await lockedView(ctx, listing, paywall.media, me)
        : null,
      auctionHasBids: (auction?.bidCount ?? 0) > 0,
      images: listing.imageIds.flatMap((id, i) => {
        const url = imageUrls[i];
        return url ? [{ id, url }] : [];
      }),
      seller: seller
        ? {
            _id: seller._id,
            name: publicSellerName(seller),
            location: seller.location ?? null,
            memberSince: seller._creationTime,
            isPro: (await getPlan(ctx, seller._id)) === "pro",
            verified: !!seller.verified,
            avatarUrl: seller.avatarStorageId
              ? await ctx.storage.getUrl(seller.avatarStorageId)
              : null,
            ...summarize(sellerStats),
          }
        : null,
      isOwner: me?._id === listing.sellerId,
    };
  },
});

/** Original files only for the seller or a buyer whose purchase was granted. */
async function lockedView(
  ctx: QueryCtx,
  listing: Doc<"listings">,
  media: LockedMedia[],
  me: Doc<"users"> | null,
) {
  const [canView, unlock] = await Promise.all([
    canViewLocked(ctx, listing, me),
    me && me._id !== listing.sellerId
      ? getUnlock(ctx, listing._id, me._id)
      : null,
  ]);
  const urls = canView
    ? await Promise.all(media.map((m) => ctx.storage.getUrl(m.storageId)))
    : [];
  return {
    photoCount: media.filter((m) => m.kind === "image").length,
    videoCount: media.filter((m) => m.kind === "video").length,
    unlockStatus: unlock?.status ?? null,
    media: canView
      ? media.flatMap((m, i) => {
          const url = urls[i];
          const previewId = listing.imageIds[i];
          // imageIds[i] is the blurred preview of media[i]
          return url && previewId
            ? [{ storageId: m.storageId, kind: m.kind, url, previewId }]
            : [];
        })
      : null,
  };
}

export const bySeller = query({
  args: {
    sellerId: v.id("users"),
    status: listingStatusValidator,
    paginationOpts: paginationOptsValidator,
    // "items" = regular listings, "instant" = paywalled Instant Content. Missing = both
    kind: v.optional(v.union(v.literal("items"), v.literal("instant"))),
  },
  handler: async (ctx, { sellerId, status, paginationOpts, kind }) => {
    const paywallFilter =
      kind === "items"
        ? sql` and paywall is null`
        : kind === "instant"
          ? sql` and paywall is not null`
          : empty;
    const result = await ctx.db.paginate(
      "listings",
      {
        where: sql`seller_id = ${sellerId}::uuid and status = ${status}${paywallFilter}`,
        order: [{ column: "created_at", cast: "timestamptz" }],
        direction: "desc",
      },
      paginationOpts,
    );
    return {
      ...result,
      page: await Promise.all(result.page.map((l) => toCard(ctx, l))),
    };
  },
});

export const create = mutation({
  args: {
    ...listingFields,
    saleType: saleTypeValidator,
    // Required when saleType is "auction"
    durationHours: v.optional(v.number()),
  },
  handler: async (ctx, { saleType, durationHours, locked, ...fields }) => {
    const user = await requireCapability(ctx, "list");
    validateListing(fields);
    assertOwnFiles(fields.imageIds, user._id, "public");
    const limits = PLAN_LIMITS[await getPlan(ctx, user._id)];
    if (locked) {
      if (!limits.lockedContent)
        throw new AppError({
          code: "FORBIDDEN",
          message: "Locked photo and video listings are a Pro feature",
        });
      if (saleType !== "fixed")
        throw new AppError({
          code: "BAD_REQUEST",
          message: "Locked listings must be fixed price",
        });
      await validateLockedMedia(ctx, user._id, locked, fields.imageIds.length);
    } else {
      checkPhotoLimit(fields.imageIds.length, limits.maxPhotos);
    }
    if (saleType === "auction" && !limits.auctions)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Auctions are a Pro feature",
      });
    if (
      saleType === "auction" &&
      (durationHours === undefined || !isAllowedDuration(durationHours))
    )
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Pick an auction length",
      });

    const listingId = await ctx.db.insert("listings", {
      ...cleanListing(fields),
      sellerId: user._id,
      status: "active",
      saleType,
      ...(locked ? { paywall: { media: locked } } : {}),
    });
    if (saleType === "auction" && durationHours !== undefined) {
      await createAuction(ctx, {
        listingId,
        sellerId: user._id,
        startingBidCents: fields.priceCents,
        durationHours,
      });
    }
    await insertListingPost(ctx, { _id: listingId, sellerId: user._id }, false);
    return listingId;
  },
});

export const update = mutation({
  args: { listingId: v.id("listings"), ...listingFields },
  handler: async (ctx, { listingId, locked, ...fields }) => {
    const listing = await requireOwnListing(ctx, listingId);
    validateListing(fields);
    assertOwnFiles(
      fields.imageIds,
      listing.sellerId,
      "public",
      listing.imageIds,
    );
    // The paywall can't be switched on or off after publishing
    if (!!locked !== !!listing.paywall)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "A listing can't change between locked and regular",
      });
    if (locked) {
      await validateLockedMedia(
        ctx,
        listing.sellerId,
        locked,
        fields.imageIds.length,
        (listing.paywall?.media ?? []).map((m) => m.storageId),
      );
    } else {
      const limits = PLAN_LIMITS[await getPlan(ctx, listing.sellerId)];
      checkPhotoLimit(
        fields.imageIds.length,
        limits.maxPhotos,
        listing.imageIds.length,
      );
    }
    // Delete files removed during edit so storage doesn't leak
    const keptLocked = new Set((locked ?? []).map((m) => m.storageId));
    const removed = [
      ...listing.imageIds.filter((id) => !fields.imageIds.includes(id)),
      ...(listing.paywall?.media ?? [])
        .filter((m) => !keptLocked.has(m.storageId))
        .map((m) => m.storageId),
    ];
    const auction = await getAuctionByListing(ctx, listingId);
    const priceCents = await syncAuctionPrice(ctx, auction, fields.priceCents);
    removed.forEach((id) => ctx.storage.delete(id));
    await ctx.db.patch("listings", listingId, {
      ...cleanListing(fields),
      priceCents,
      ...(locked ? { paywall: { media: locked } } : {}),
    });
    return listingId;
  },
});

export const setStatus = mutation({
  args: {
    listingId: v.id("listings"),
    status: v.union(v.literal("active"), v.literal("sold")),
  },
  handler: async (ctx, { listingId, status }) => {
    const listing = await requireOwnListing(ctx, listingId);
    if (listing.saleType === "auction")
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Auctions close automatically",
      });
    if (listing.status === status) return null;
    await ctx.db.patch("listings", listingId, { status });
    // Sales count follows the sold flag so mistakes can be undone by relisting
    await bumpStats(ctx, listing.sellerId, {
      salesCount: status === "sold" ? 1 : -1,
    });
    return null;
  },
});

export const remove = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const listing = await requireOwnListing(ctx, listingId);
    const auction = await getAuctionByListing(ctx, listingId);
    if (auction && auction.status === "live" && auction.bidCount > 0)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "You can't delete an auction that already has bids",
      });
    await deleteListingCascade(ctx, listing);
    return null;
  },
});
