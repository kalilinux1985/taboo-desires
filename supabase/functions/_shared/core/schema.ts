// Table definitions: the TypeScript shape of each row ("Doc") and how its
// fields map to Postgres columns. Docs keep the field names the app already
// used (`_id`, `_creationTime`, camelCase) so the UI didn't need to change.

import type {
  Category,
  Condition,
  CustomStatus,
  ForumTopicId,
  ListingStatus,
  MediaKind,
  Party,
  PostKind,
  SaleType,
  SubscriptionStatus,
  UnlockStatus,
} from "../domain/enums.ts";
import type { SellerDetails } from "../domain/sellerDetails.ts";
import type { Subcategory } from "../domain/subcategories.ts";
import type { BuyerDetails } from "../domain/buyerDetails.ts";

/** Branded string id so ids of different tables can't be mixed up. */
export type Id<T extends string> = string & { __tableName: T };

type SystemFields<T extends string> = { _id: Id<T>; _creationTime: number };

export type LockedMedia = { storageId: Id<"_storage">; kind: MediaKind };

type Fields = {
  users: {
    tokenIdentifier: string;
    name?: string;
    email?: string;
    shopName?: string;
    bio?: string;
    location?: string;
    avatarStorageId?: Id<"_storage">;
    role?: "admin";
    accountType?: "buyer" | "seller";
    verified: boolean;
    sellerDetails?: SellerDetails;
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
  favorites: { userId: Id<"users">; listingId: Id<"listings"> };
  profilePhotos: { userId: Id<"users">; storageId: Id<"_storage"> };
  subscriptions: {
    userId: Id<"users">;
    plan: "pro";
    status: SubscriptionStatus;
    requestedAt: string;
    /** "" = never approved / revoked */
    expiresAt: string;
    note?: string;
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
  follows: { followerId: Id<"users">; sellerId: Id<"users"> };
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
  threads: {
    authorId: Id<"users">;
    topic: ForumTopicId;
    title: string;
    body: string;
    replyCount: number;
    lastActivityAt: string;
  };
  replies: { threadId: Id<"threads">; authorId: Id<"users">; body: string };
  posts: {
    authorId: Id<"users">;
    kind: PostKind;
    body: string;
    imageIds: Id<"_storage">[];
    listingId?: Id<"listings">;
    repost: boolean;
    likeCount: number;
    commentCount: number;
  };
  postLikes: { postId: Id<"posts">; userId: Id<"users"> };
  postComments: { postId: Id<"posts">; authorId: Id<"users">; body: string };
  messages: {
    conversationId: Id<"conversations">;
    senderId: Id<"users">;
    body: string;
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
      email: c("email"),
      shopName: c("shop_name"),
      bio: c("bio"),
      location: c("location"),
      avatarStorageId: c("avatar_storage_id"),
      role: c("role"),
      accountType: c("account_type"),
      verified: c("verified", "bool"),
      sellerDetails: c("seller_details", "json"),
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
  favorites: {
    sqlName: "favorites",
    columns: {
      userId: c("user_id", "uuid"),
      listingId: c("listing_id", "uuid"),
    },
  },
  profilePhotos: {
    sqlName: "profile_photos",
    columns: { userId: c("user_id", "uuid"), storageId: c("storage_id") },
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
  threads: {
    sqlName: "threads",
    columns: {
      authorId: c("author_id", "uuid"),
      topic: c("topic"),
      title: c("title"),
      body: c("body"),
      replyCount: c("reply_count", "int"),
      lastActivityAt: c("last_activity_at", "ts"),
    },
  },
  replies: {
    sqlName: "replies",
    columns: {
      threadId: c("thread_id", "uuid"),
      authorId: c("author_id", "uuid"),
      body: c("body"),
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
  json: "jsonb",
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
