// Table definitions: the TypeScript shape of each row ("Doc") and how its
// fields map to Postgres columns. Docs keep the field names the app already
// used (`_id`, `_creationTime`, camelCase) so the UI didn't need to change.

import type {
  Category,
  Condition,
  CustomStatus,
  ListingStatus,
  MediaKind,
  Party,
  PostKind,
  SaleType,
  SubscriptionStatus,
  UnlockStatus,
} from "../domain/enums.ts";
import type { SellerDetails } from "../domain/sellerDetails.ts";
import type { SellerSettings } from "../domain/sellerSettings.ts";
import type { Subcategory } from "../domain/subcategories.ts";
import type { BuyerDetails } from "../domain/buyerDetails.ts";
import type { OrderStatus, ShippingAddress } from "../domain/shipping.ts";

export type ReportType =
  | "nonconsensual_intimate"
  | "underage"
  | "copyright"
  | "illegal"
  | "harassment"
  | "other";
export type ReportTargetKind = "listing" | "post" | "comment" | "profile" | "other";

/** Branded string id so ids of different tables can't be mixed up. */
export type Id<T extends string> = string & { __tableName: T };

type SystemFields<T extends string> = { _id: Id<T>; _creationTime: number };

export type LockedMedia = { storageId: Id<"_storage">; kind: MediaKind };

type Fields = {
  users: {
    tokenIdentifier: string;
    name?: string;
    /** Unique, set by the database from the shop name or name: the profile address /username */
    username?: string;
    email?: string;
    shopName?: string;
    bio?: string;
    location?: string;
    avatarStorageId?: Id<"_storage">;
    role?: "admin";
    accountType?: "buyer" | "seller";
    verified: boolean;
    /** Proved they're 18+ (an admin approved their ID check) */
    ageVerified: boolean;
    sellerDetails?: SellerDetails;
    /** Seller settings: payment methods, offerings, notifications and visibility */
    settings?: SellerSettings;
    buyerDetails?: BuyerDetails;
  };
  presence: { userId: Id<"users">; lastSeenAt: string };
  profileVisits: { userId: Id<"users">; count: number };
  verifications: {
    userId: Id<"users">;
    status: "pending" | "approved" | "rejected";
    photoStorageId?: Id<"_storage">;
    requestedAt: string;
    reviewedAt?: string;
    reason?: string;
  };
  blocks: { blockerId: Id<"users">; blockedId: Id<"users"> };
  contentReports: {
    reportType: ReportType;
    targetKind: ReportTargetKind;
    targetId?: string;
    targetUrl?: string;
    description: string;
    reporterName: string;
    reporterEmail: string;
    reporterUserId?: Id<"users">;
    isDepicted: boolean;
    signature: string;
    status: "open" | "removed" | "dismissed";
    dueAt: string;
    resolvedAt?: string;
    resolvedBy?: Id<"users">;
    resolutionNote?: string;
  };
  ageVerifications: {
    userId: Id<"users">;
    status: "pending" | "approved" | "rejected" | "underage";
    /** "YYYY-MM-DD"; not kept for under-18 entries */
    birthDate?: string;
    /** Private photos, deleted as soon as an admin has reviewed them */
    idStorageId?: Id<"_storage">;
    selfieStorageId?: Id<"_storage">;
    requestedAt: string;
    reviewedAt?: string;
    reason?: string;
  };
  favorites: { userId: Id<"users">; listingId: Id<"listings"> };
  profilePhotos: {
    userId: Id<"users">;
    storageId: Id<"_storage">;
    albumId?: Id<"photoAlbums">;
    description?: string;
  };
  photoAlbums: { userId: Id<"users">; name: string };
  photoLikes: { photoId: Id<"profilePhotos">; userId: Id<"users"> };
  photoComments: { photoId: Id<"profilePhotos">; authorId: Id<"users">; body: string };
  subscriptions: {
    userId: Id<"users">;
    plan: "pro";
    status: SubscriptionStatus;
    requestedAt: string;
    /** "" = never approved / revoked */
    expiresAt: string;
    note?: string;
    /** Plan length picked on the pricing page */
    requestedMonths?: number;
    /** Asked to pay some way other than the standard subscription */
    payAnotherWay?: boolean;
  };
  listings: {
    sellerId: Id<"users">;
    title: string;
    description: string;
    category: Category;
    subcategory?: Subcategory;
    brand: string;
    size: string;
    condition: Condition;
    priceCents: number;
    imageIds: Id<"_storage">[];
    status: ListingStatus;
    /** The status a hidden listing goes back to */
    hiddenPrevStatus?: Exclude<ListingStatus, "hidden">;
    saleType: SaleType;
    paywall?: { media: LockedMedia[] };
  };
  conversations: {
    /** Missing once the listing has been deleted */
    listingId?: Id<"listings">;
    buyerId: Id<"users">;
    sellerId: Id<"users">;
    lastMessageAt: string;
    lastMessagePreview: string;
    lastSenderId: Id<"users">;
    buyerUnread: boolean;
    sellerUnread: boolean;
  };
  auctions: {
    listingId: Id<"listings">;
    sellerId: Id<"users">;
    startingBidCents: number;
    currentBidCents: number;
    bidCount: number;
    highBidderId?: Id<"users">;
    endsAt: string;
    status: "live" | "ended";
  };
  unlocks: {
    listingId: Id<"listings">;
    buyerId: Id<"users">;
    sellerId: Id<"users">;
    status: UnlockStatus;
    requestedAt: string;
    /** When the seller granted access; it lasts UNLOCK_HOURS from then */
    grantedAt?: string;
  };
  customRequests: {
    buyerId: Id<"users">;
    sellerId: Id<"users">;
    category: Category;
    wearTime: Condition;
    size: string;
    details: string;
    budgetCents: number;
    offerCents: number;
    offeredBy: Party;
    note?: string;
    status: CustomStatus;
    updatedAt: string;
  };
  reviews: {
    sellerId: Id<"users">;
    reviewerId: Id<"users">;
    rating: number;
    body: string;
    updatedAt: string;
  };
  follows: { followerId: Id<"users">; sellerId: Id<"users">; status: "pending" | "accepted" };
  sellerStats: {
    sellerId: Id<"users">;
    followerCount: number;
    reviewCount: number;
    ratingSum: number;
    salesCount: number;
  };
  bids: {
    auctionId: Id<"auctions">;
    bidderId?: Id<"users">;
    amountCents: number;
  };
  posts: {
    authorId: Id<"users">;
    kind: PostKind;
    body: string;
    imageIds: Id<"_storage">[];
    listingId?: Id<"listings">;
    repost: boolean;
    likeCount: number;
    commentCount: number;
    /** Held back after 2 or more reports */
    hidden?: boolean;
  };
  postLikes: { postId: Id<"posts">; userId: Id<"users"> };
  postComments: {
    postId: Id<"posts">;
    authorId: Id<"users">;
    body: string;
    /** Set on replies (one level deep) */
    parentId?: Id<"postComments">;
    likeCount: number;
    replyCount: number;
    /** Held back after 2 or more reports */
    hidden?: boolean;
  };
  postCommentLikes: { commentId: Id<"postComments">; userId: Id<"users"> };
  messages: {
    conversationId: Id<"conversations">;
    senderId: Id<"users">;
    body: string;
  };
  orders: {
    sellerId: Id<"users">;
    buyerId: Id<"users">;
    listingId?: Id<"listings">;
    customRequestId?: Id<"customRequests">;
    title: string;
    status: OrderStatus;
    shipTo?: ShippingAddress;
    easypostShipmentId?: string;
    carrier?: string;
    service?: string;
    postageCents?: number;
    trackingCode?: string;
    trackingUrl?: string;
    trackingStatus?: string;
    labelUrl?: string;
    labelCreatedAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    updatedAt: string;
  };
  shippingAddresses: {
    userId: Id<"users">;
    kind: "ship_to" | "ship_from";
    address: ShippingAddress;
    updatedAt: string;
  };
};

export type TableName = keyof Fields | "_storage";
export type DbTable = keyof Fields;
export type NewDoc<T extends DbTable> = Fields[T];
export type Doc<T extends DbTable> = SystemFields<T> & Fields[T];

// ---------------------------------------------------------------------------
// Column mapping
// ---------------------------------------------------------------------------

export type ColumnKind =
  | "text"
  | "uuid"
  | "int"
  | "bool"
  | "json"
  | "ts"
  | "tsOrEmpty"
  | "textArray";
type Column = { column: string; kind: ColumnKind };
type TableDef<T extends DbTable> = {
  sqlName: string;
  columns: { [K in keyof Fields[T]]-?: Column };
};

const c = (column: string, kind: ColumnKind = "text"): Column => ({
  column,
  kind,
});

export const TABLES: { [T in DbTable]: TableDef<T> } = {
  users: {
    sqlName: "users",
    columns: {
      tokenIdentifier: c("token_identifier"),
      name: c("name"),
      username: c("username"),
      email: c("email"),
      shopName: c("shop_name"),
      bio: c("bio"),
      location: c("location"),
      avatarStorageId: c("avatar_storage_id"),
      role: c("role"),
      accountType: c("account_type"),
      verified: c("verified", "bool"),
      ageVerified: c("age_verified", "bool"),
      sellerDetails: c("seller_details", "json"),
      settings: c("settings", "json"),
      buyerDetails: c("buyer_details", "json"),
    },
  },
  presence: {
    sqlName: "presence",
    columns: {
      userId: c("user_id", "uuid"),
      lastSeenAt: c("last_seen_at", "ts"),
    },
  },
  profileVisits: {
    sqlName: "profile_visits",
    columns: { userId: c("user_id", "uuid"), count: c("count", "int") },
  },
  verifications: {
    sqlName: "verifications",
    columns: {
      userId: c("user_id", "uuid"),
      status: c("status"),
      photoStorageId: c("photo_storage_id"),
      requestedAt: c("requested_at", "ts"),
      reviewedAt: c("reviewed_at", "ts"),
      reason: c("reason"),
    },
  },
  blocks: {
    sqlName: "blocks",
    columns: {
      blockerId: c("blocker_id", "uuid"),
      blockedId: c("blocked_id", "uuid"),
    },
  },
  contentReports: {
    sqlName: "content_reports",
    columns: {
      reportType: c("report_type"),
      targetKind: c("target_kind"),
      targetId: c("target_id"),
      targetUrl: c("target_url"),
      description: c("description"),
      reporterName: c("reporter_name"),
      reporterEmail: c("reporter_email"),
      reporterUserId: c("reporter_user_id", "uuid"),
      isDepicted: c("is_depicted", "bool"),
      signature: c("signature"),
      status: c("status"),
      dueAt: c("due_at", "ts"),
      resolvedAt: c("resolved_at", "ts"),
      resolvedBy: c("resolved_by", "uuid"),
      resolutionNote: c("resolution_note"),
    },
  },
  ageVerifications: {
    sqlName: "age_verifications",
    columns: {
      userId: c("user_id", "uuid"),
      status: c("status"),
      birthDate: c("birth_date"),
      idStorageId: c("id_storage_id"),
      selfieStorageId: c("selfie_storage_id"),
      requestedAt: c("requested_at", "ts"),
      reviewedAt: c("reviewed_at", "ts"),
      reason: c("reason"),
    },
  },
  favorites: {
    sqlName: "favorites",
    columns: {
      userId: c("user_id", "uuid"),
      listingId: c("listing_id", "uuid"),
    },
  },
  profilePhotos: {
    sqlName: "profile_photos",
    columns: {
      userId: c("user_id", "uuid"),
      storageId: c("storage_id"),
      albumId: c("album_id", "uuid"),
      description: c("description"),
    },
  },
  photoAlbums: {
    sqlName: "photo_albums",
    columns: { userId: c("user_id", "uuid"), name: c("name") },
  },
  photoLikes: {
    sqlName: "photo_likes",
    columns: { photoId: c("photo_id", "uuid"), userId: c("user_id", "uuid") },
  },
  photoComments: {
    sqlName: "photo_comments",
    columns: { photoId: c("photo_id", "uuid"), authorId: c("author_id", "uuid"), body: c("body") },
  },
  subscriptions: {
    sqlName: "subscriptions",
    columns: {
      userId: c("user_id", "uuid"),
      plan: c("plan"),
      status: c("status"),
      requestedAt: c("requested_at", "ts"),
      expiresAt: c("expires_at", "tsOrEmpty"),
      note: c("note"),
      requestedMonths: c("requested_months", "int"),
      payAnotherWay: c("pay_another_way", "bool"),
    },
  },
  listings: {
    sqlName: "listings",
    columns: {
      sellerId: c("seller_id", "uuid"),
      title: c("title"),
      description: c("description"),
      category: c("category"),
      subcategory: c("subcategory"),
      brand: c("brand"),
      size: c("size"),
      condition: c("condition"),
      priceCents: c("price_cents", "int"),
      hiddenPrevStatus: c("hidden_prev_status"),
      imageIds: c("image_ids", "textArray"),
      status: c("status"),
      saleType: c("sale_type"),
      paywall: c("paywall", "json"),
    },
  },
  conversations: {
    sqlName: "conversations",
    columns: {
      listingId: c("listing_id", "uuid"),
      buyerId: c("buyer_id", "uuid"),
      sellerId: c("seller_id", "uuid"),
      lastMessageAt: c("last_message_at", "ts"),
      lastMessagePreview: c("last_message_preview"),
      lastSenderId: c("last_sender_id", "uuid"),
      buyerUnread: c("buyer_unread", "bool"),
      sellerUnread: c("seller_unread", "bool"),
    },
  },
  auctions: {
    sqlName: "auctions",
    columns: {
      listingId: c("listing_id", "uuid"),
      sellerId: c("seller_id", "uuid"),
      startingBidCents: c("starting_bid_cents", "int"),
      currentBidCents: c("current_bid_cents", "int"),
      bidCount: c("bid_count", "int"),
      highBidderId: c("high_bidder_id", "uuid"),
      endsAt: c("ends_at", "ts"),
      status: c("status"),
    },
  },
  unlocks: {
    sqlName: "unlocks",
    columns: {
      listingId: c("listing_id", "uuid"),
      buyerId: c("buyer_id", "uuid"),
      sellerId: c("seller_id", "uuid"),
      status: c("status"),
      requestedAt: c("requested_at", "ts"),
      grantedAt: c("granted_at", "ts"),
    },
  },
  customRequests: {
    sqlName: "custom_requests",
    columns: {
      buyerId: c("buyer_id", "uuid"),
      sellerId: c("seller_id", "uuid"),
      category: c("category"),
      wearTime: c("wear_time"),
      size: c("size"),
      details: c("details"),
      budgetCents: c("budget_cents", "int"),
      offerCents: c("offer_cents", "int"),
      offeredBy: c("offered_by"),
      note: c("note"),
      status: c("status"),
      updatedAt: c("updated_at", "ts"),
    },
  },
  reviews: {
    sqlName: "reviews",
    columns: {
      sellerId: c("seller_id", "uuid"),
      reviewerId: c("reviewer_id", "uuid"),
      rating: c("rating", "int"),
      body: c("body"),
      updatedAt: c("updated_at", "ts"),
    },
  },
  follows: {
    sqlName: "follows",
    columns: {
      followerId: c("follower_id", "uuid"),
      sellerId: c("seller_id", "uuid"),
      status: c("status"),
    },
  },
  sellerStats: {
    sqlName: "seller_stats",
    columns: {
      sellerId: c("seller_id", "uuid"),
      followerCount: c("follower_count", "int"),
      reviewCount: c("review_count", "int"),
      ratingSum: c("rating_sum", "int"),
      salesCount: c("sales_count", "int"),
    },
  },
  bids: {
    sqlName: "bids",
    columns: {
      auctionId: c("auction_id", "uuid"),
      bidderId: c("bidder_id", "uuid"),
      amountCents: c("amount_cents", "int"),
    },
  },
  posts: {
    sqlName: "posts",
    columns: {
      authorId: c("author_id", "uuid"),
      kind: c("kind"),
      body: c("body"),
      imageIds: c("image_ids", "textArray"),
      listingId: c("listing_id", "uuid"),
      repost: c("repost", "bool"),
      likeCount: c("like_count", "int"),
      commentCount: c("comment_count", "int"),
      hidden: c("hidden", "bool"),
    },
  },
  postLikes: {
    sqlName: "post_likes",
    columns: { postId: c("post_id", "uuid"), userId: c("user_id", "uuid") },
  },
  postComments: {
    sqlName: "post_comments",
    columns: {
      postId: c("post_id", "uuid"),
      authorId: c("author_id", "uuid"),
      body: c("body"),
      parentId: c("parent_id", "uuid"),
      likeCount: c("like_count", "int"),
      replyCount: c("reply_count", "int"),
      hidden: c("hidden", "bool"),
    },
  },
  postCommentLikes: {
    sqlName: "post_comment_likes",
    columns: {
      commentId: c("comment_id", "uuid"),
      userId: c("user_id", "uuid"),
    },
  },
  messages: {
    sqlName: "messages",
    columns: {
      conversationId: c("conversation_id", "uuid"),
      senderId: c("sender_id", "uuid"),
      body: c("body"),
    },
  },
  orders: {
    sqlName: "orders",
    columns: {
      sellerId: c("seller_id", "uuid"),
      buyerId: c("buyer_id", "uuid"),
      listingId: c("listing_id", "uuid"),
      customRequestId: c("custom_request_id", "uuid"),
      title: c("title"),
      status: c("status"),
      shipTo: c("ship_to", "json"),
      easypostShipmentId: c("easypost_shipment_id"),
      carrier: c("carrier"),
      service: c("service"),
      postageCents: c("postage_cents", "int"),
      trackingCode: c("tracking_code"),
      trackingUrl: c("tracking_url"),
      trackingStatus: c("tracking_status"),
      labelUrl: c("label_url"),
      labelCreatedAt: c("label_created_at", "ts"),
      shippedAt: c("shipped_at", "ts"),
      deliveredAt: c("delivered_at", "ts"),
      updatedAt: c("updated_at", "ts"),
    },
  },
  shippingAddresses: {
    sqlName: "shipping_addresses",
    columns: {
      userId: c("user_id", "uuid"),
      kind: c("kind"),
      address: c("address", "json"),
      updatedAt: c("updated_at", "ts"),
    },
  },
};

// ---------------------------------------------------------------------------
// Value conversion. Drivers differ: postgres.js returns typed JS values, the
// simple test driver returns text. Both are accepted.
// ---------------------------------------------------------------------------

export function toIso(raw: unknown): string {
  if (raw instanceof Date) return raw.toISOString();
  const s = String(raw);
  // Postgres text output: "2026-10-31 16:27:52.6+00"
  const normalized = s.includes("T")
    ? s
    : s.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) throw new Error(`Unparseable timestamp: ${s}`);
  return d.toISOString();
}

export function parsePgTextArray(raw: string): string[] {
  // Only used for arrays of storage ids: no quotes, commas or backslashes inside elements
  const inner = raw.replace(/^\{|\}$/g, "");
  if (!inner) return [];
  return inner.split(",").map((s) => s.replace(/^"|"$/g, ""));
}

export function fromDb(kind: ColumnKind, raw: unknown): unknown {
  if (raw === null || raw === undefined)
    return kind === "tsOrEmpty" ? "" : undefined;
  switch (kind) {
    case "text":
    case "uuid":
      return String(raw);
    case "int":
      return Number(raw);
    case "bool":
      return raw === true || raw === "t" || raw === "true";
    case "json":
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    case "ts":
    case "tsOrEmpty":
      return toIso(raw);
    case "textArray":
      return Array.isArray(raw)
        ? raw.map(String)
        : parsePgTextArray(String(raw));
  }
}

export function toDb(kind: ColumnKind, value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (kind === "tsOrEmpty" && value === "") return null;
  return value;
}

export const SQL_CAST: Record<ColumnKind, string> = {
  text: "text",
  uuid: "uuid",
  int: "int",
  bool: "boolean",
  // Bound as text, then parsed: a parameter typed jsonb would be JSON-encoded a
  // second time by the postgres driver and stored as a string.
  json: "text::jsonb",
  ts: "timestamptz",
  tsOrEmpty: "timestamptz",
  textArray: "text[]",
};

export function rowToDoc<T extends DbTable>(
  table: T,
  row: Record<string, unknown>,
): Doc<T> {
  const def = TABLES[table];
  const doc: Record<string, unknown> = {
    _id: String(row.id),
    _creationTime: Date.parse(toIso(row.created_at)),
  };
  for (const [field, col] of Object.entries(def.columns) as [
    string,
    Column,
  ][]) {
    const value = fromDb(col.kind, row[col.column]);
    if (value !== undefined) doc[field] = value;
  }
  return doc as unknown as Doc<T>;
}

export function columnOf<T extends DbTable>(table: T, field: string): Column {
  const col = (TABLES[table].columns as Record<string, Column>)[field];
  if (!col) throw new Error(`Unknown field ${table}.${field}`);
  return col;
}
