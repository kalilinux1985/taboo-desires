"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// supabase/functions/api/index.ts
var import_npm_postgres_3_4 = __toESM(require("npm:postgres@3.4.5"), 1);
var import_supabase_js_2_49 = require("npm:@supabase/supabase-js@2.49.4");

// supabase/functions/_shared/core/errors.ts
var AppError = class extends Error {
  data;
  constructor(data) {
    super(data.message);
    this.name = "AppError";
    this.data = data;
  }
};
var HTTP_STATUS = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  INVALID_ARGS: 400,
  INTERNAL: 500
};

// supabase/functions/_shared/core/sql.ts
var Sql = class {
  constructor(parts, values) {
    this.parts = parts;
    this.values = values;
  }
  parts;
  values;
};
function sql(strings, ...values) {
  return new Sql([...strings], values);
}
function raw(text) {
  return new Sql([text], []);
}
var empty = raw("");
function join(items, separator = ", ") {
  if (items.length === 0) return empty;
  const parts = [""];
  const values = [];
  items.forEach((item, i) => {
    if (i > 0) parts[parts.length - 1] += separator;
    values.push(item);
    parts.push("");
  });
  return new Sql(parts, values);
}
function arrayLiteral(items) {
  const escaped = items.map((item) => {
    if (item === null || item === void 0) return "NULL";
    return `"${String(item).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  });
  return `{${escaped.join(",")}}`;
}
function serialize(value) {
  if (value === null || value === void 0) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("Refusing to send a non-finite number to SQL");
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return arrayLiteral(value);
  return JSON.stringify(value);
}
function compile(query2) {
  const params = [];
  const walk = (q) => {
    let text = q.parts[0];
    q.values.forEach((value, i) => {
      if (value instanceof Sql) {
        text += walk(value);
      } else {
        params.push(serialize(value));
        text += `$${params.length}`;
      }
      text += q.parts[i + 1];
    });
    return text;
  };
  return { text: walk(query2), params };
}

// supabase/functions/_shared/core/schema.ts
var c = (column, kind = "text") => ({
  column,
  kind
});
var TABLES = {
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
      buyerDetails: c("buyer_details", "json")
    }
  },
  presence: {
    sqlName: "presence",
    columns: {
      userId: c("user_id", "uuid"),
      lastSeenAt: c("last_seen_at", "ts")
    }
  },
  profileVisits: {
    sqlName: "profile_visits",
    columns: { userId: c("user_id", "uuid"), count: c("count", "int") }
  },
  verifications: {
    sqlName: "verifications",
    columns: {
      userId: c("user_id", "uuid"),
      status: c("status"),
      photoStorageId: c("photo_storage_id"),
      requestedAt: c("requested_at", "ts"),
      reviewedAt: c("reviewed_at", "ts"),
      reason: c("reason")
    }
  },
  blocks: {
    sqlName: "blocks",
    columns: {
      blockerId: c("blocker_id", "uuid"),
      blockedId: c("blocked_id", "uuid")
    }
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
      resolutionNote: c("resolution_note")
    }
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
      reason: c("reason")
    }
  },
  favorites: {
    sqlName: "favorites",
    columns: {
      userId: c("user_id", "uuid"),
      listingId: c("listing_id", "uuid")
    }
  },
  profilePhotos: {
    sqlName: "profile_photos",
    columns: {
      userId: c("user_id", "uuid"),
      storageId: c("storage_id"),
      albumId: c("album_id", "uuid"),
      description: c("description")
    }
  },
  photoAlbums: {
    sqlName: "photo_albums",
    columns: { userId: c("user_id", "uuid"), name: c("name") }
  },
  photoLikes: {
    sqlName: "photo_likes",
    columns: { photoId: c("photo_id", "uuid"), userId: c("user_id", "uuid") }
  },
  photoComments: {
    sqlName: "photo_comments",
    columns: { photoId: c("photo_id", "uuid"), authorId: c("author_id", "uuid"), body: c("body") }
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
      payAnotherWay: c("pay_another_way", "bool")
    }
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
      paywall: c("paywall", "json")
    }
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
      sellerUnread: c("seller_unread", "bool")
    }
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
      status: c("status")
    }
  },
  unlocks: {
    sqlName: "unlocks",
    columns: {
      listingId: c("listing_id", "uuid"),
      buyerId: c("buyer_id", "uuid"),
      sellerId: c("seller_id", "uuid"),
      status: c("status"),
      requestedAt: c("requested_at", "ts"),
      grantedAt: c("granted_at", "ts")
    }
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
      updatedAt: c("updated_at", "ts")
    }
  },
  reviews: {
    sqlName: "reviews",
    columns: {
      sellerId: c("seller_id", "uuid"),
      reviewerId: c("reviewer_id", "uuid"),
      rating: c("rating", "int"),
      body: c("body"),
      updatedAt: c("updated_at", "ts")
    }
  },
  follows: {
    sqlName: "follows",
    columns: {
      followerId: c("follower_id", "uuid"),
      sellerId: c("seller_id", "uuid"),
      status: c("status")
    }
  },
  sellerStats: {
    sqlName: "seller_stats",
    columns: {
      sellerId: c("seller_id", "uuid"),
      followerCount: c("follower_count", "int"),
      reviewCount: c("review_count", "int"),
      ratingSum: c("rating_sum", "int"),
      salesCount: c("sales_count", "int")
    }
  },
  bids: {
    sqlName: "bids",
    columns: {
      auctionId: c("auction_id", "uuid"),
      bidderId: c("bidder_id", "uuid"),
      amountCents: c("amount_cents", "int")
    }
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
      hidden: c("hidden", "bool")
    }
  },
  postLikes: {
    sqlName: "post_likes",
    columns: { postId: c("post_id", "uuid"), userId: c("user_id", "uuid") }
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
      hidden: c("hidden", "bool")
    }
  },
  postCommentLikes: {
    sqlName: "post_comment_likes",
    columns: {
      commentId: c("comment_id", "uuid"),
      userId: c("user_id", "uuid")
    }
  },
  messages: {
    sqlName: "messages",
    columns: {
      conversationId: c("conversation_id", "uuid"),
      senderId: c("sender_id", "uuid"),
      body: c("body")
    }
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
      updatedAt: c("updated_at", "ts")
    }
  },
  shippingAddresses: {
    sqlName: "shipping_addresses",
    columns: {
      userId: c("user_id", "uuid"),
      kind: c("kind"),
      address: c("address", "json"),
      updatedAt: c("updated_at", "ts")
    }
  }
};
function toIso(raw2) {
  if (raw2 instanceof Date) return raw2.toISOString();
  const s = String(raw2);
  const normalized = s.includes("T") ? s : s.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) throw new Error(`Unparseable timestamp: ${s}`);
  return d.toISOString();
}
function parsePgTextArray(raw2) {
  const inner = raw2.replace(/^\{|\}$/g, "");
  if (!inner) return [];
  return inner.split(",").map((s) => s.replace(/^"|"$/g, ""));
}
function fromDb(kind, raw2) {
  if (raw2 === null || raw2 === void 0)
    return kind === "tsOrEmpty" ? "" : void 0;
  switch (kind) {
    case "text":
    case "uuid":
      return String(raw2);
    case "int":
      return Number(raw2);
    case "bool":
      return raw2 === true || raw2 === "t" || raw2 === "true";
    case "json":
      return typeof raw2 === "string" ? JSON.parse(raw2) : raw2;
    case "ts":
    case "tsOrEmpty":
      return toIso(raw2);
    case "textArray":
      return Array.isArray(raw2) ? raw2.map(String) : parsePgTextArray(String(raw2));
  }
}
function toDb(kind, value) {
  if (value === void 0 || value === null) return null;
  if (kind === "tsOrEmpty" && value === "") return null;
  return value;
}
var SQL_CAST = {
  text: "text",
  uuid: "uuid",
  int: "int",
  bool: "boolean",
  // Bound as text, then parsed: a parameter typed jsonb would be JSON-encoded a
  // second time by the postgres driver and stored as a string.
  json: "text::jsonb",
  ts: "timestamptz",
  tsOrEmpty: "timestamptz",
  textArray: "text[]"
};
function rowToDoc(table, row) {
  const def = TABLES[table];
  const doc = {
    _id: String(row.id),
    _creationTime: Date.parse(toIso(row.created_at))
  };
  for (const [field, col] of Object.entries(def.columns)) {
    const value = fromDb(col.kind, row[col.column]);
    if (value !== void 0) doc[field] = value;
  }
  return doc;
}
function columnOf(table, field) {
  const col = TABLES[table].columns[field];
  if (!col) throw new Error(`Unknown field ${table}.${field}`);
  return col;
}

// supabase/functions/_shared/core/values.ts
function fail(path, expected) {
  throw new AppError({
    code: "INVALID_ARGS",
    message: `Invalid argument${path ? ` "${path}"` : ""}: expected ${expected}`
  });
}
function make(kind, parse) {
  return { kind, optional: false, parse };
}
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}
var STORAGE_ID_RE = /^(public-media|private-media)\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,128}$/;
function isStorageId(value) {
  return typeof value === "string" && STORAGE_ID_RE.test(value);
}
var v = {
  string: () => make(
    "string",
    (x, p) => typeof x === "string" && x.length <= 1e5 ? x : fail(p, "a string")
  ),
  number: () => make(
    "number",
    (x, p) => typeof x === "number" && Number.isFinite(x) ? x : fail(p, "a number")
  ),
  boolean: () => make(
    "boolean",
    (x, p) => typeof x === "boolean" ? x : fail(p, "a boolean")
  ),
  null: () => make("null", (x, p) => x === null ? null : fail(p, "null")),
  literal: (lit) => make(
    "literal",
    (x, p) => x === lit ? lit : fail(p, JSON.stringify(lit))
  ),
  id: (_table) => make(
    "id",
    (x, p) => isUuid(x) ? x.toLowerCase() : fail(p, `a ${_table} id`)
  ),
  storageId: () => make(
    "storageId",
    (x, p) => isStorageId(x) ? x : fail(p, "a file id")
  ),
  array: (item, max = 1e3) => make("array", (x, p) => {
    if (!Array.isArray(x) || x.length > max)
      return fail(p, `an array (max ${max})`);
    return x.map((el, i) => item.parse(el, `${p}[${i}]`));
  }),
  object: (shape) => make(
    "object",
    (x, p) => parseObject(shape, x, p)
  ),
  union: (...members) => make("union", (x, p) => {
    for (const m of members) {
      try {
        return m.parse(x, p);
      } catch {
      }
    }
    return fail(p, members.map((m) => m.kind).join(" | "));
  }),
  optional: (inner) => ({
    kind: `optional ${inner.kind}`,
    optional: true,
    parse: (x, p) => x === void 0 ? void 0 : inner.parse(x, p)
  })
};
function parseObject(shape, x, path = "") {
  if (typeof x !== "object" || x === null || Array.isArray(x))
    fail(path, "an object");
  const input = x;
  for (const key of Object.keys(input)) {
    if (!(key in shape)) fail(path ? `${path}.${key}` : key, "no such field");
  }
  const out = {};
  for (const [key, validator] of Object.entries(shape)) {
    const value = validator.parse(input[key], path ? `${path}.${key}` : key);
    if (value !== void 0) out[key] = value;
  }
  return out;
}
var paginationOptsValidator = v.object({
  numItems: v.number(),
  cursor: v.union(v.string(), v.null())
});

// supabase/functions/_shared/core/db.ts
var MAX_PAGE = 200;
function encodeCursor(values) {
  const bytes = new TextEncoder().encode(JSON.stringify(values));
  let bin = "";
  bytes.forEach((b) => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeCursor(cursor) {
  try {
    const bin = atob(cursor.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return Array.isArray(parsed) && parsed.every((x) => typeof x === "string") ? parsed : null;
  } catch {
    return null;
  }
}
function cursorValue(cast, raw2) {
  return cast === "timestamptz" ? toIso(raw2) : String(raw2);
}
var Db = class {
  constructor(driver) {
    this.driver = driver;
  }
  driver;
  reads = /* @__PURE__ */ new Set();
  /** Marks tables as read by a hand-written query (for live updates). */
  touch(...tables) {
    for (const t of tables) this.reads.add(TABLES[t].sqlName);
  }
  async rows(query2) {
    const { text, params } = compile(query2);
    return await this.driver.query(text, params);
  }
  /** First column of the first row, or null. */
  async scalar(query2) {
    const rows = await this.rows(query2);
    if (rows.length === 0) return null;
    return Object.values(rows[0])[0] ?? null;
  }
  async get(table, id) {
    if (!isUuid(id)) return null;
    const docs = await this.select(table, sql`where id = ${id}::uuid`);
    return docs[0] ?? null;
  }
  /** `select * from <table> <rest>` mapped to Docs. `rest` holds where / order by / limit. */
  async select(table, rest = empty) {
    this.touch(table);
    const rows = await this.rows(
      sql`select * from public.${raw(TABLES[table].sqlName)} ${rest}`
    );
    return rows.map((r) => rowToDoc(table, r));
  }
  async first(table, rest = empty) {
    const docs = await this.select(table, sql`${rest} limit 1`);
    return docs[0] ?? null;
  }
  /** Rows of a table selected by an arbitrary query that returns `<table>.*`. */
  async docs(table, query2) {
    this.touch(table);
    return (await this.rows(query2)).map((r) => rowToDoc(table, r));
  }
  async insert(table, fields) {
    const entries = Object.entries(fields).filter(
      ([, value]) => value !== void 0
    );
    const cols = entries.map(([field]) => raw(columnOf(table, field).column));
    const vals = entries.map(([field, value]) => {
      const col = columnOf(table, field);
      return sql`${toDb(col.kind, value)}::${raw(SQL_CAST[col.kind])}`;
    });
    const rows = await this.rows(
      entries.length ? sql`insert into public.${raw(TABLES[table].sqlName)} (${join(cols)}) values (${join(vals)}) returning id` : sql`insert into public.${raw(TABLES[table].sqlName)} default values returning id`
    );
    return String(rows[0].id);
  }
  /** Updates the given fields. A field set to `undefined` is cleared (set to null). */
  async patch(table, id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;
    const sets = keys.map((field) => {
      const col = columnOf(table, field);
      const value = fields[field];
      return sql`${raw(col.column)} = ${toDb(col.kind, value)}::${raw(SQL_CAST[col.kind])}`;
    });
    await this.rows(
      sql`update public.${raw(TABLES[table].sqlName)} set ${join(sets)} where id = ${id}::uuid`
    );
  }
  async delete(table, id) {
    await this.rows(
      sql`delete from public.${raw(TABLES[table].sqlName)} where id = ${id}::uuid`
    );
  }
  /**
   * Keyset pagination: rows matching `where`, ordered by `order` then id,
   * all in `direction`. The cursor holds the sort values of the last row.
   */
  async paginate(table, spec, opts) {
    this.touch(table);
    const limit = Math.max(1, Math.min(MAX_PAGE, Math.floor(opts.numItems)));
    const order = [
      ...spec.order,
      { column: "id", cast: "text" }
    ];
    const op = raw(spec.direction === "asc" ? ">" : "<");
    const conditions = spec.where ? [spec.where] : [];
    const after = opts.cursor ? decodeCursor(opts.cursor) : null;
    if (after && after.length === order.length) {
      const lhs = join(order.map((o) => raw(o.column)));
      const rhs = join(
        order.map(
          (o, i) => sql`${after[i]}::${raw(o.column === "id" ? "uuid" : o.cast)}`
        )
      );
      conditions.push(sql`(${lhs}) ${op} (${rhs})`);
    }
    const where = conditions.length ? sql`where ${join(conditions, " and ")}` : empty;
    const orderBy = join(
      order.map((o) => raw(`${o.column} ${spec.direction}`))
    );
    const rows = await this.rows(
      sql`select * from public.${raw(TABLES[table].sqlName)} ${where} order by ${orderBy} limit ${limit + 1}`
    );
    const isDone = rows.length <= limit;
    const pageRows = rows.slice(0, limit);
    const last = pageRows[pageRows.length - 1];
    const continueCursor = last ? encodeCursor(order.map((o) => cursorValue(o.cast, last[o.column]))) : opts.cursor ?? "";
    return {
      page: pageRows.map((r) => rowToDoc(table, r)),
      isDone,
      continueCursor
    };
  }
  /** Offset pagination for ranked queries (search). `query` must return `<table>.*`. */
  async paginateOffset(table, query2, opts) {
    this.touch(table);
    const limit = Math.max(1, Math.min(MAX_PAGE, Math.floor(opts.numItems)));
    const offset = opts.cursor && /^o:\d+$/.test(opts.cursor) ? Number(opts.cursor.slice(2)) : 0;
    const rows = await this.rows(
      sql`${query2} limit ${limit + 1} offset ${offset}`
    );
    return {
      page: rows.slice(0, limit).map((r) => rowToDoc(table, r)),
      isDone: rows.length <= limit,
      continueCursor: `o:${offset + Math.min(rows.length, limit)}`
    };
  }
};

// supabase/functions/_shared/core/storage.ts
var BUCKETS = {
  public: "public-media",
  private: "private-media"
};
var SIGNED_URL_TTL = 6 * 60 * 60;
function splitStorageId(id) {
  if (!isStorageId(id)) return null;
  const slash = id.indexOf("/");
  const bucket = id.slice(0, slash);
  const path = id.slice(slash + 1);
  return { bucket, path, ownerId: path.split("/")[0] };
}
function isOwnFile(id, userId, visibility) {
  const parts = splitStorageId(id);
  return !!parts && parts.ownerId === userId && parts.bucket === BUCKETS[visibility];
}
var Storage = class {
  constructor(backend, db2) {
    this.backend = backend;
    this.db = db2;
  }
  backend;
  db;
  pendingDeletes = /* @__PURE__ */ new Set();
  signBatch = null;
  /** A URL the browser can load, or null for an invalid id. Private files get a signed URL. */
  getUrl(id) {
    if (!id) return Promise.resolve(null);
    const parts = splitStorageId(id);
    if (!parts) return Promise.resolve(null);
    if (parts.bucket !== BUCKETS.private)
      return Promise.resolve(this.backend.publicUrl(parts.bucket, parts.path));
    return new Promise((resolve2) => {
      if (!this.signBatch) {
        const batch = {
          ids: [],
          resolvers: []
        };
        this.signBatch = batch;
        queueMicrotask(async () => {
          this.signBatch = null;
          try {
            const urls = await this.backend.signedUrls(
              BUCKETS.private,
              batch.ids.map((x) => splitStorageId(x).path),
              SIGNED_URL_TTL
            );
            batch.resolvers.forEach((r, i) => r(urls[i] ?? null));
          } catch (e) {
            console.error("signing private URLs failed", e);
            batch.resolvers.forEach((r) => r(null));
          }
        });
      }
      this.signBatch.ids.push(id);
      this.signBatch.resolvers.push(resolve2);
    });
  }
  /** Content type recorded at upload, null if unknown, undefined if the file doesn't exist. */
  async getContentType(id) {
    const parts = splitStorageId(id);
    if (!parts) return void 0;
    return await this.backend.contentType(this.db, parts.bucket, parts.path);
  }
  /** Queues a file for deletion once the transaction has committed. */
  delete(id) {
    if (id && splitStorageId(id)) this.pendingDeletes.add(id);
  }
  async generateUploadUrl(ownerId, visibility) {
    const bucket = BUCKETS[visibility];
    const path = `${ownerId}/${crypto.randomUUID()}`;
    const { signedUrl, token } = await this.backend.createUploadUrl(
      bucket,
      path
    );
    return {
      storageId: `${bucket}/${path}`,
      bucket,
      path,
      token,
      signedUrl
    };
  }
  /** Runs queued deletions. Called after commit; failures are logged, not thrown. */
  async flushDeletes() {
    if (this.pendingDeletes.size === 0) return;
    const byBucket = /* @__PURE__ */ new Map();
    for (const id of this.pendingDeletes) {
      const parts = splitStorageId(id);
      byBucket.set(parts.bucket, [
        ...byBucket.get(parts.bucket) ?? [],
        parts.path
      ]);
    }
    this.pendingDeletes.clear();
    for (const [bucket, paths] of byBucket) {
      try {
        await this.backend.remove(bucket, paths);
      } catch (e) {
        console.error(
          `deleting ${paths.length} file(s) from ${bucket} failed`,
          e
        );
      }
    }
  }
};

// supabase/functions/_shared/core/runner.ts
var MAX_ATTEMPTS = 6;
function isRetryable(e) {
  const code = e?.code;
  return code === "40001" || code === "40P01";
}
function asForbidden(e) {
  const err = e;
  if (err?.code !== "42501" || typeof err.message !== "string") return null;
  if (err.message.startsWith("permission denied")) return null;
  return new AppError({ code: "FORBIDDEN", message: err.message });
}
function lookup(registry2, name) {
  const [mod, fn, ...rest] = name.split(".");
  if (!mod || !fn || rest.length) return null;
  if (!Object.hasOwn(registry2, mod) || !Object.hasOwn(registry2[mod], fn))
    return null;
  return registry2[mod][fn];
}
async function execute(name, rawArgs, opts) {
  const def = lookup(opts.registry, name);
  if (!def || def.kind === "internal" && !opts.allowInternal) {
    throw new AppError({
      code: "NOT_FOUND",
      message: `Unknown function ${name}`
    });
  }
  const args = parseObject(def.args, rawArgs ?? {});
  if (def.kind === "action") return await runAction(def, args, opts);
  return await runInTransaction(def, args, opts);
}
async function runAction(def, args, opts) {
  const reads = /* @__PURE__ */ new Set();
  const writes = /* @__PURE__ */ new Set();
  const run = async (inner, innerArgs) => {
    if (inner.kind === "action")
      throw new Error("Actions can't call other actions");
    const result = await runInTransaction(inner, innerArgs, opts);
    result.reads.forEach((t) => reads.add(t));
    result.writes.forEach((t) => writes.add(t));
    return result.value;
  };
  const ctx = {
    auth: { getUserIdentity: async () => opts.identity },
    now: opts.now ?? Date.now,
    runQuery: (fn, a) => run(fn, a),
    runMutation: (fn, a) => run(fn, a)
  };
  const value = await def.handler(ctx, args);
  return {
    value: value === void 0 ? null : value,
    reads: [...reads],
    writes: [...writes]
  };
}
async function runInTransaction(def, args, opts) {
  const now = opts.now ?? Date.now;
  for (let attempt = 1; ; attempt++) {
    let storage2 = null;
    try {
      const result = await opts.runner.transaction(
        def.kind === "query" ? "read" : "write",
        async (driver) => {
          const db2 = new Db(driver);
          storage2 = new Storage(opts.storage, db2);
          const ctx = {
            db: db2,
            storage: storage2,
            auth: { getUserIdentity: async () => opts.identity },
            now
          };
          const value = await def.handler(ctx, args);
          const written = def.kind === "query" ? null : await db2.scalar(
            sql`select current_setting('app.written', true)`
          );
          const writes = typeof written === "string" ? written.split(",").filter(Boolean) : [];
          return {
            value: value === void 0 ? null : value,
            reads: [...db2.reads],
            writes
          };
        }
      );
      await storage2?.flushDeletes();
      return result;
    } catch (e) {
      if (isRetryable(e) && attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, Math.random() * 20 * attempt));
        continue;
      }
      throw asForbidden(e) ?? e;
    }
  }
}

// supabase/functions/_shared/core/http.ts
var MAX_BODY_BYTES = 1e6;
function createHandler(opts) {
  const cors = (req) => {
    const origin = req.headers.get("origin") ?? "";
    const anyOrigin = opts.allowedOrigins.includes("*");
    const allow = anyOrigin ? "*" : opts.allowedOrigins.includes(origin) ? origin : opts.allowedOrigins[0];
    return {
      "Access-Control-Allow-Origin": allow,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin"
    };
  };
  return async (req) => {
    const headers = { ...cors(req), "Content-Type": "application/json" };
    if (req.method === "OPTIONS") return new Response(null, { headers });
    if (req.method !== "POST")
      return new Response(null, { status: 405, headers });
    try {
      const text = await req.text();
      if (text.length > MAX_BODY_BYTES)
        throw new AppError({
          code: "BAD_REQUEST",
          message: "Request too large"
        });
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        throw new AppError({ code: "BAD_REQUEST", message: "Invalid JSON" });
      }
      if (!body || typeof body.fn !== "string") {
        throw new AppError({
          code: "BAD_REQUEST",
          message: "Missing function name"
        });
      }
      const identity = await opts.identify(req.headers.get("x-user-token"));
      const result = await execute(body.fn, body.args ?? {}, {
        registry: opts.registry,
        runner: opts.runner,
        storage: opts.storage,
        identity
      });
      return new Response(JSON.stringify(result), { headers });
    } catch (e) {
      if (e instanceof AppError) {
        return new Response(JSON.stringify({ error: e.data }), {
          status: HTTP_STATUS[e.data.code],
          headers
        });
      }
      console.error(e);
      return new Response(
        JSON.stringify({
          error: { code: "INTERNAL", message: "Something went wrong" }
        }),
        {
          status: 500,
          headers
        }
      );
    }
  };
}

// supabase/functions/_shared/modules/accountDeletion.ts
var accountDeletion_exports = {};
__export(accountDeletion_exports, {
  deleteMyAccount: () => deleteMyAccount
});

// supabase/functions/_shared/core/functions.ts
function query(def) {
  return { kind: "query", ...def };
}
function mutation(def) {
  return { kind: "mutation", ...def };
}
function internalMutation(def) {
  return { kind: "internal", ...def };
}
function action(def) {
  return { kind: "action", ...def };
}

// supabase/functions/_shared/lib/auth.ts
async function getCurrentUserDoc(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db.first(
    "users",
    sql`where token_identifier = ${identity.tokenIdentifier}`
  );
}
async function requireUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new AppError({
      code: "UNAUTHENTICATED",
      message: "Please sign in first"
    });
  }
  const user = await getCurrentUserDoc(ctx);
  if (!user) {
    throw new AppError({ code: "NOT_FOUND", message: "User not found" });
  }
  return user;
}
function publicSellerName(user) {
  return user.shopName || user.name || (user.accountType === "buyer" ? "Anonymous buyer" : "Anonymous seller");
}

// supabase/functions/_shared/modules/accountDeletion.ts
var deleteMyAccount = mutation({
  args: { confirmation: v.string() },
  handler: async (ctx, { confirmation }) => {
    const user = await requireUser(ctx);
    if (confirmation.trim().toUpperCase() !== "DELETE") {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Type DELETE to confirm"
      });
    }
    if (user.role === "admin") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Admin accounts can't be deleted from Settings"
      });
    }
    const id = user._id;
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
      select photo_storage_id from public.verifications where user_id = ${id}::uuid and photo_storage_id is not null
      union all
      select id_storage_id from public.age_verifications where user_id = ${id}::uuid and id_storage_id is not null
      union all
      select selfie_storage_id from public.age_verifications where user_id = ${id}::uuid and selfie_storage_id is not null`);
    ctx.storage.delete(user.avatarStorageId);
    for (const f of files) ctx.storage.delete(f.storage_id);
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
       where f.follower_id = ${id}::uuid and f.status = 'accepted' and s.seller_id = f.seller_id`);
    await ctx.db.delete("users", id);
    return null;
  }
});

// supabase/functions/_shared/modules/ageVerification.ts
var ageVerification_exports = {};
__export(ageVerification_exports, {
  adminPending: () => adminPending,
  mine: () => mine,
  review: () => review,
  submit: () => submit
});

// supabase/functions/_shared/domain/plans.ts
var PLAN_LIMITS = {
  free: { maxPhotos: 4, auctions: false, lockedContent: false },
  pro: { maxPhotos: 12, auctions: true, lockedContent: true }
};
var LOCKED_MEDIA_MAX = 10;
var APPROVAL_MONTHS = [1, 3, 6, 12];
function isAllowedMonths(months) {
  return APPROVAL_MONTHS.includes(months);
}
function isProActive(sub, nowMs) {
  return !!sub && (sub.status === "active" || sub.status === "pending") && !!sub.expiresAt && Date.parse(sub.expiresAt) > nowMs;
}
function addMonthsIso(fromMs, months) {
  const d = new Date(fromMs);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString();
}
function nextExpiry(sub, months, nowMs) {
  const base = isProActive(sub, nowMs) && sub?.expiresAt ? Date.parse(sub.expiresAt) : nowMs;
  return addMonthsIso(base, months);
}

// supabase/functions/_shared/lib/subscription.ts
async function getSubscription(ctx, userId) {
  return await ctx.db.first(
    "subscriptions",
    sql`where user_id = ${userId}::uuid`
  );
}
async function getPlan(ctx, userId) {
  return isProActive(await getSubscription(ctx, userId), ctx.now()) ? "pro" : "free";
}
async function requireAdmin(ctx) {
  const user = await requireUser(ctx);
  if (user.role !== "admin")
    throw new AppError({ code: "FORBIDDEN", message: "Admins only" });
  return user;
}

// supabase/functions/_shared/domain/age.ts
var AGE_VERIFICATION_ENABLED = false;
var isAgeVerified = (ageVerified) => !AGE_VERIFICATION_ENABLED || !!ageVerified;
var MIN_AGE = 18;
function parseBirthDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1900) return null;
  const date = new Date(Date.UTC(y, mo - 1, d));
  const real = date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
  return real ? m[0] : null;
}
var pad = (n) => String(n).padStart(2, "0");
function isAdult(birthDate, today) {
  const cutoff = `${today.getUTCFullYear() - MIN_AGE}-${pad(today.getUTCMonth() + 1)}-${pad(today.getUTCDate())}`;
  return birthDate <= cutoff;
}
function ageOn(birthDate, today) {
  const [y, m, d] = birthDate.split("-").map(Number);
  let age = today.getUTCFullYear() - y;
  const before = today.getUTCMonth() + 1 < m || today.getUTCMonth() + 1 === m && today.getUTCDate() < d;
  if (before) age -= 1;
  return age;
}

// supabase/functions/_shared/modules/ageVerification.ts
var REASON_MAX = 300;
async function getRow(ctx, userId) {
  return await ctx.db.first(
    "ageVerifications",
    sql`where user_id = ${userId}::uuid`
  );
}
var bad = (message) => new AppError({ code: "BAD_REQUEST", message });
async function requireOwnImage(ctx, storageId, userId) {
  if (!isOwnFile(storageId, userId, "private"))
    throw new AppError({ code: "NOT_FOUND", message: "Photo not found" });
  const contentType = await ctx.storage.getContentType(storageId);
  if (contentType === void 0)
    throw new AppError({ code: "NOT_FOUND", message: "Photo not found" });
  if (contentType && !contentType.startsWith("image/"))
    throw bad("Please upload photos only");
}
var mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    const row = await getRow(ctx, me._id);
    return {
      verified: !!me.ageVerified,
      status: row?.status ?? null,
      reason: row?.status === "rejected" ? row.reason ?? null : null
    };
  }
});
var submit = mutation({
  args: {
    birthDate: v.string(),
    // Not needed for an under-18 date of birth
    idPhotoStorageId: v.optional(v.storageId()),
    selfieStorageId: v.optional(v.storageId())
  },
  handler: async (ctx, { birthDate, idPhotoStorageId, selfieStorageId }) => {
    const me = await requireUser(ctx);
    const conflict = (message) => new AppError({ code: "CONFLICT", message });
    if (me.ageVerified) throw conflict("Your age is already verified");
    const existing = await getRow(ctx, me._id);
    if (existing?.status === "pending")
      throw conflict("Your documents are already in review");
    if (existing?.status === "underage")
      throw new AppError({
        code: "FORBIDDEN",
        message: `You must be ${MIN_AGE} or older to use this site`
      });
    const born = parseBirthDate(birthDate);
    if (!born) throw bad("Enter your date of birth");
    const now = new Date(ctx.now());
    if (!isAdult(born, now)) {
      ctx.storage.delete(idPhotoStorageId);
      ctx.storage.delete(selfieStorageId);
      const fields2 = {
        status: "underage",
        birthDate: void 0,
        idStorageId: void 0,
        selfieStorageId: void 0,
        requestedAt: now.toISOString(),
        reviewedAt: now.toISOString(),
        reason: void 0
      };
      if (existing) await ctx.db.patch("ageVerifications", existing._id, fields2);
      else await ctx.db.insert("ageVerifications", { userId: me._id, ...fields2 });
      return { status: "underage" };
    }
    if (!idPhotoStorageId || !selfieStorageId)
      throw bad("Add both photos: your ID and a selfie holding it");
    if (idPhotoStorageId === selfieStorageId)
      throw bad("Send two different photos: your ID and a selfie holding it");
    await requireOwnImage(ctx, idPhotoStorageId, me._id);
    await requireOwnImage(ctx, selfieStorageId, me._id);
    const fields = {
      status: "pending",
      birthDate: born,
      idStorageId: idPhotoStorageId,
      selfieStorageId,
      requestedAt: now.toISOString(),
      reviewedAt: void 0,
      reason: void 0
    };
    if (existing) {
      ctx.storage.delete(existing.idStorageId);
      ctx.storage.delete(existing.selfieStorageId);
      await ctx.db.patch("ageVerifications", existing._id, fields);
    } else {
      await ctx.db.insert("ageVerifications", { userId: me._id, ...fields });
    }
    return { status: "pending" };
  }
});
var adminPending = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db.paginate(
      "ageVerifications",
      {
        where: sql`status = 'pending'`,
        order: [{ column: "requested_at", cast: "timestamptz" }],
        direction: "asc"
      },
      paginationOpts
    );
    const now = new Date(ctx.now());
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (r) => {
          const user = await ctx.db.get("users", r.userId);
          return {
            _id: r._id,
            userId: r.userId,
            memberName: user ? publicSellerName(user) : "Deleted user",
            email: user?.email ?? null,
            accountType: user?.accountType ?? null,
            birthDate: r.birthDate ?? null,
            age: r.birthDate ? ageOn(r.birthDate, now) : null,
            requestedAt: r.requestedAt,
            idUrl: r.idStorageId ? await ctx.storage.getUrl(r.idStorageId) : null,
            selfieUrl: r.selfieStorageId ? await ctx.storage.getUrl(r.selfieStorageId) : null
          };
        })
      )
    };
  }
});
var review = mutation({
  args: {
    verificationId: v.id("ageVerifications"),
    approve: v.boolean(),
    reason: v.optional(v.string())
  },
  handler: async (ctx, { verificationId, approve: approve2, reason }) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get("ageVerifications", verificationId);
    if (!row || row.status !== "pending") throw bad("Not a pending request");
    const note = reason?.trim();
    if (note && note.length > REASON_MAX) throw bad("Reason is too long");
    if (approve2 && (!row.birthDate || !isAdult(row.birthDate, new Date(ctx.now()))))
      throw bad("The date of birth shows they're under 18. Decline instead.");
    ctx.storage.delete(row.idStorageId);
    ctx.storage.delete(row.selfieStorageId);
    await ctx.db.patch("ageVerifications", verificationId, {
      status: approve2 ? "approved" : "rejected",
      idStorageId: void 0,
      selfieStorageId: void 0,
      reviewedAt: new Date(ctx.now()).toISOString(),
      reason: approve2 ? void 0 : note || void 0
    });
    if (approve2) await ctx.db.patch("users", row.userId, { ageVerified: true });
    return null;
  }
});

// supabase/functions/_shared/modules/activity.ts
var activity_exports = {};
__export(activity_exports, {
  getActivity: () => getActivity,
  getBadges: () => getBadges,
  heartbeat: () => heartbeat,
  recordProfileVisit: () => recordProfileVisit
});
var HEARTBEAT_MIN_GAP_MS = 6e4;
var heartbeat = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    const row = await ctx.db.first(
      "presence",
      sql`where user_id = ${me._id}::uuid`
    );
    if (row && ctx.now() - Date.parse(row.lastSeenAt) < HEARTBEAT_MIN_GAP_MS)
      return null;
    const now = new Date(ctx.now()).toISOString();
    await ctx.db.rows(sql`
      insert into public.presence (user_id, last_seen_at) values (${me._id}::uuid, ${now}::timestamptz)
      on conflict (user_id) do update set last_seen_at = excluded.last_seen_at`);
    return null;
  }
});
var recordProfileVisit = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await getCurrentUserDoc(ctx);
    if (me?._id === userId) return null;
    if (!await ctx.db.get("users", userId)) return null;
    await ctx.db.rows(sql`
      insert into public.profile_visits (user_id, count) values (${userId}::uuid, 1)
      on conflict (user_id) do update set count = profile_visits.count + 1`);
    return null;
  }
});
async function getActivity(ctx, userId) {
  const [presence, visits] = await Promise.all([
    ctx.db.first("presence", sql`where user_id = ${userId}::uuid`),
    ctx.db.first("profileVisits", sql`where user_id = ${userId}::uuid`)
  ]);
  return {
    lastSeenAt: presence?.lastSeenAt ?? null,
    profileVisits: visits?.count ?? 0
  };
}
var YEAR_MS = 365 * 24 * 60 * 60 * 1e3;
async function getBadges(ctx, user) {
  const [review3, photo] = await Promise.all([
    ctx.db.first("reviews", sql`where reviewer_id = ${user._id}::uuid`),
    ctx.db.first("profilePhotos", sql`where user_id = ${user._id}::uuid`)
  ]);
  const details = user.accountType === "buyer" ? user.buyerDetails : user.sellerDetails;
  const candidates = [
    [
      !!user.verified,
      {
        key: "verified",
        label: "Verified",
        description: "Identity checked by our team"
      }
    ],
    [
      ctx.now() - user._creationTime > YEAR_MS,
      {
        key: "veteran",
        label: "1 Year Member",
        description: "Member for over a year"
      }
    ],
    [
      !!user.avatarStorageId && !!user.bio,
      {
        key: "profile",
        label: "Profile Complete",
        description: "Added a picture and bio"
      }
    ],
    [
      !!details && Object.keys(details).length > 0,
      {
        key: "details",
        label: "Open Book",
        description: "Shared profile details"
      }
    ],
    [
      !!photo,
      {
        key: "photos",
        label: "Photogenic",
        description: "Posted profile photos"
      }
    ],
    [
      !!review3,
      {
        key: "reviewer",
        label: "Reviewer",
        description: "Left a review for a seller"
      }
    ]
  ];
  return candidates.filter(([earned]) => earned).map(([, badge]) => badge);
}

// supabase/functions/_shared/modules/blocks.ts
var blocks_exports = {};
__export(blocks_exports, {
  assertNotBlocked: () => assertNotBlocked,
  isBlocked: () => isBlocked,
  list: () => list,
  toggle: () => toggle
});

// supabase/functions/_shared/lib/sellerStats.ts
async function getStats(ctx, sellerId) {
  return await ctx.db.first(
    "sellerStats",
    sql`where seller_id = ${sellerId}::uuid`
  );
}
async function bumpStats(ctx, sellerId, delta) {
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
function summarize(stats) {
  const reviewCount = stats?.reviewCount ?? 0;
  const ratingSum = stats?.ratingSum ?? 0;
  return {
    followerCount: stats?.followerCount ?? 0,
    salesCount: stats?.salesCount ?? 0,
    reviewCount,
    rating: reviewCount ? Math.round(ratingSum / reviewCount * 10) / 10 : null
  };
}
async function canReview(ctx, reviewerId, sellerId) {
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

// supabase/functions/_shared/modules/blocks.ts
async function assertNotBlocked(ctx, a, b) {
  const hit = await ctx.db.first(
    "blocks",
    sql`where (blocker_id = ${a}::uuid and blocked_id = ${b}::uuid)
           or (blocker_id = ${b}::uuid and blocked_id = ${a}::uuid)`
  );
  if (hit)
    throw new AppError({
      code: "FORBIDDEN",
      message: "You can't do this with a member who is blocked"
    });
}
var isBlocked = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return false;
    return !!await ctx.db.first(
      "blocks",
      sql`where blocker_id = ${me._id}::uuid and blocked_id = ${userId}::uuid`
    );
  }
});
var toggle = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await requireUser(ctx);
    if (me._id === userId)
      throw new AppError({ code: "BAD_REQUEST", message: "You can't block yourself" });
    if (!await ctx.db.get("users", userId))
      throw new AppError({ code: "NOT_FOUND", message: "Member not found" });
    const existing = await ctx.db.first(
      "blocks",
      sql`where blocker_id = ${me._id}::uuid and blocked_id = ${userId}::uuid`
    );
    if (existing) {
      await ctx.db.delete("blocks", existing._id);
      return false;
    }
    await ctx.db.insert("blocks", { blockerId: me._id, blockedId: userId });
    for (const [follower, followed] of [
      [me._id, userId],
      [userId, me._id]
    ]) {
      const f = await ctx.db.first(
        "follows",
        sql`where follower_id = ${follower}::uuid and seller_id = ${followed}::uuid`
      );
      if (!f) continue;
      await ctx.db.delete("follows", f._id);
      if (f.status === "accepted") await bumpStats(ctx, followed, { followerCount: -1 });
    }
    return true;
  }
});
var list = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return [];
    const rows = await ctx.db.rows(sql`
      select u.id, coalesce(nullif(u.shop_name, ''), u.name, 'Member') as display_name,
             u.avatar_storage_id
        from public.blocks b
        join public.users u on u.id = b.blocked_id
       where b.blocker_id = ${me._id}::uuid
       order by b.created_at desc
       limit 200`);
    return await Promise.all(
      rows.map(async (r) => ({
        _id: r.id,
        name: r.display_name,
        avatarUrl: r.avatar_storage_id ? await ctx.storage.getUrl(r.avatar_storage_id) : null
      }))
    );
  }
});

// supabase/functions/_shared/modules/albums.ts
var albums_exports = {};
__export(albums_exports, {
  byUser: () => byUser,
  create: () => create,
  mine: () => mine2,
  remove: () => remove
});
var NAME_MAX = 40;
var ALBUMS_MAX = 50;
var mine2 = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return [];
    const rows = await ctx.db.select(
      "photoAlbums",
      sql`where user_id = ${me._id}::uuid order by created_at limit ${ALBUMS_MAX}::int`
    );
    return rows.map((a) => ({ _id: a._id, name: a.name }));
  }
});
var create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const me = await requireUser(ctx);
    const clean2 = name.trim().replace(/\s+/g, " ");
    if (!clean2 || clean2.length > NAME_MAX)
      throw new AppError({
        code: "BAD_REQUEST",
        message: `Album names are 1 to ${NAME_MAX} characters`
      });
    const existing = await ctx.db.select("photoAlbums", sql`where user_id = ${me._id}::uuid limit ${ALBUMS_MAX}::int`);
    if (existing.some((a) => a.name.toLowerCase() === clean2.toLowerCase()))
      throw new AppError({ code: "BAD_REQUEST", message: "You already have an album with that name" });
    if (existing.length >= ALBUMS_MAX)
      throw new AppError({ code: "FORBIDDEN", message: `You can have up to ${ALBUMS_MAX} albums` });
    return await ctx.db.insert("photoAlbums", { userId: me._id, name: clean2 });
  }
});
var byUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    ctx.db.touch("photoAlbums", "profilePhotos");
    const me = await getCurrentUserDoc(ctx);
    const rows = await ctx.db.rows(sql`
      select a.id::text as id, a.name,
             (select count(*) from public.profile_photos p where p.album_id = a.id)::int as photos
        from public.photo_albums a
       where a.user_id = ${userId}::uuid
       order by a.created_at, a.id
       limit ${ALBUMS_MAX}::int`);
    const mine6 = me?._id === userId;
    return rows.filter((r) => mine6 || Number(r.photos) > 0).map((r) => ({ _id: String(r.id), name: String(r.name), photos: Number(r.photos) }));
  }
});
var remove = mutation({
  args: { albumId: v.id("photoAlbums") },
  handler: async (ctx, { albumId }) => {
    const me = await requireUser(ctx);
    const album = await ctx.db.get("photoAlbums", albumId);
    if (!album) return 0;
    if (album.userId !== me._id)
      throw new AppError({ code: "FORBIDDEN", message: "Not your album" });
    const photos = await ctx.db.select(
      "profilePhotos",
      sql`where album_id = ${albumId}::uuid and user_id = ${me._id}::uuid`
    );
    for (const p of photos) {
      ctx.storage.delete(p.storageId);
      await ctx.db.delete("profilePhotos", p._id);
    }
    await ctx.db.delete("photoAlbums", albumId);
    return photos.length;
  }
});

// supabase/functions/_shared/modules/photos.ts
var photos_exports = {};
__export(photos_exports, {
  addComment: () => addComment,
  comments: () => comments,
  removeComment: () => removeComment,
  toggleLike: () => toggleLike
});

// supabase/functions/_shared/lib/posts.ts
var POST_BODY_MAX = 1e3;
var COMMENT_MAX = 500;
var POST_IMAGES_MAX = 4;
function cleanBody(raw2, max, label, required) {
  const text = raw2.trim();
  if (required && !text)
    throw new AppError({
      code: "BAD_REQUEST",
      message: `${label} can't be empty`
    });
  if (text.length > max) {
    throw new AppError({
      code: "BAD_REQUEST",
      message: `${label} must be under ${max} characters`
    });
  }
  return text;
}
async function insertListingPost(ctx, listing, repost, body = "") {
  return await ctx.db.insert("posts", {
    authorId: listing.sellerId,
    kind: "listing",
    repost,
    body,
    imageIds: [],
    listingId: listing._id,
    likeCount: 0,
    commentCount: 0
  });
}
async function deletePostCascade(ctx, post) {
  post.imageIds.forEach((id) => ctx.storage.delete(id));
  await ctx.db.delete("posts", post._id);
}
async function loadFeedAuthor(ctx, userId) {
  const user = await ctx.db.get("users", userId);
  if (!user) {
    return {
      _id: userId,
      name: "Deleted user",
      avatarUrl: null,
      accountType: null,
      country: null,
      verified: false,
      isPro: false
    };
  }
  const details = user.accountType === "buyer" ? user.buyerDetails : user.sellerDetails;
  return {
    _id: user._id,
    name: publicSellerName(user),
    avatarUrl: user.avatarStorageId ? await ctx.storage.getUrl(user.avatarStorageId) : null,
    accountType: user.accountType ?? null,
    country: details?.country ?? null,
    verified: !!user.verified,
    isPro: user.accountType === "seller" && await getPlan(ctx, user._id) === "pro"
  };
}
async function loadListingPreview(ctx, listingId) {
  const listing = await ctx.db.get("listings", listingId);
  if (!listing) return null;
  return {
    _id: listing._id,
    title: listing.title,
    priceCents: listing.priceCents,
    status: listing.status,
    isLocked: !!listing.paywall,
    imageUrl: listing.imageIds[0] ? await ctx.storage.getUrl(listing.imageIds[0]) : null
  };
}
var POST_LIKERS_SHOWN = 9;
var COMMENT_LIKERS_SHOWN = 3;
async function toLikers(ctx, userIds) {
  const authors = await Promise.all(userIds.map((id) => loadFeedAuthor(ctx, id)));
  return authors.filter((a) => a.name !== "Deleted user").map((a) => ({ _id: a._id, name: a.name, avatarUrl: a.avatarUrl }));
}
async function loadPostLikers(ctx, postId, limit) {
  ctx.db.touch("postLikes");
  const rows = await ctx.db.rows(sql`
    select user_id from public.post_likes
     where post_id = ${postId}::uuid
     order by created_at desc, id desc
     limit ${limit}`);
  return toLikers(ctx, rows.map((r) => String(r.user_id)));
}
async function loadCommentLikers(ctx, commentIds, perComment) {
  const byComment = /* @__PURE__ */ new Map();
  if (commentIds.length === 0) return byComment;
  ctx.db.touch("postCommentLikes");
  const rows = await ctx.db.rows(sql`
    select comment_id, user_id from (
      select comment_id, user_id,
             row_number() over (partition by comment_id order by created_at desc, id desc) as n
        from public.post_comment_likes
       where comment_id = any(${commentIds}::uuid[])
    ) ranked
     where n <= ${perComment}
     order by comment_id, n`);
  const ids = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const key = String(r.comment_id);
    ids.set(key, [...ids.get(key) ?? [], String(r.user_id)]);
  }
  await Promise.all(
    [...ids].map(async ([key, users]) => byComment.set(key, await toLikers(ctx, users)))
  );
  return byComment;
}
async function toFeedItem(ctx, post, me) {
  const [author, imageUrls, listing, myLike, likers2] = await Promise.all([
    loadFeedAuthor(ctx, post.authorId),
    Promise.all(post.imageIds.map((id) => ctx.storage.getUrl(id))),
    post.listingId ? loadListingPreview(ctx, post.listingId) : null,
    me ? ctx.db.first(
      "postLikes",
      sql`where post_id = ${post._id}::uuid and user_id = ${me._id}::uuid`
    ) : null,
    post.likeCount > 0 ? loadPostLikers(ctx, post._id, POST_LIKERS_SHOWN) : []
  ]);
  return {
    _id: post._id,
    _creationTime: post._creationTime,
    kind: post.kind,
    repost: post.repost,
    body: post.body,
    images: imageUrls.filter((u) => u !== null),
    listing,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    likedByMe: !!myLike,
    likers: likers2,
    canDelete: !!me && (me._id === post.authorId || me.role === "admin"),
    author
  };
}

// supabase/functions/_shared/modules/photos.ts
var COMMENTS_SHOWN = 100;
var toggleLike = mutation({
  args: { photoId: v.id("profilePhotos") },
  handler: async (ctx, { photoId }) => {
    const me = await requireUser(ctx);
    const photo = await ctx.db.get("profilePhotos", photoId);
    if (!photo) throw new AppError({ code: "NOT_FOUND", message: "Photo not found" });
    const existing = await ctx.db.first(
      "photoLikes",
      sql`where photo_id = ${photoId}::uuid and user_id = ${me._id}::uuid`
    );
    if (existing) {
      await ctx.db.delete("photoLikes", existing._id);
      return false;
    }
    await ctx.db.insert("photoLikes", { photoId, userId: me._id });
    return true;
  }
});
var comments = query({
  args: { photoId: v.id("profilePhotos") },
  handler: async (ctx, { photoId }) => {
    const me = await getCurrentUserDoc(ctx);
    const rows = await ctx.db.select(
      "photoComments",
      sql`where photo_id = ${photoId}::uuid order by created_at desc, id desc limit ${COMMENTS_SHOWN}::int`
    );
    return await Promise.all(
      rows.map(async (c2) => ({
        _id: c2._id,
        _creationTime: c2._creationTime,
        body: c2.body,
        author: await loadFeedAuthor(ctx, c2.authorId),
        canDelete: !!me && (me._id === c2.authorId || me.role === "admin")
      }))
    );
  }
});
var addComment = mutation({
  args: { photoId: v.id("profilePhotos"), body: v.string() },
  handler: async (ctx, { photoId, body }) => {
    const me = await requireUser(ctx);
    const photo = await ctx.db.get("profilePhotos", photoId);
    if (!photo) throw new AppError({ code: "NOT_FOUND", message: "Photo not found" });
    const text = cleanBody(body, COMMENT_MAX, "Comment", true);
    return await ctx.db.insert("photoComments", { photoId, authorId: me._id, body: text });
  }
});
var removeComment = mutation({
  args: { commentId: v.id("photoComments") },
  handler: async (ctx, { commentId }) => {
    const me = await requireUser(ctx);
    const comment = await ctx.db.get("photoComments", commentId);
    if (!comment) return null;
    if (comment.authorId !== me._id && me.role !== "admin")
      throw new AppError({ code: "FORBIDDEN", message: "You can't delete this comment" });
    await ctx.db.delete("photoComments", commentId);
    return null;
  }
});

// supabase/functions/_shared/modules/auctions.ts
var auctions_exports = {};
__export(auctions_exports, {
  closeDue: () => closeDue,
  endingSoon: () => endingSoon,
  forListing: () => forListing,
  placeBid: () => placeBid,
  relist: () => relist
});

// supabase/functions/_shared/lib/auctionState.ts
async function getAuctionByListing(ctx, listingId) {
  return await ctx.db.first(
    "auctions",
    sql`where listing_id = ${listingId}::uuid`
  );
}
async function createAuction(ctx, args) {
  const endsAtMs = ctx.now() + args.durationHours * 60 * 60 * 1e3;
  return await ctx.db.insert("auctions", {
    listingId: args.listingId,
    sellerId: args.sellerId,
    startingBidCents: args.startingBidCents,
    currentBidCents: args.startingBidCents,
    bidCount: 0,
    endsAt: new Date(endsAtMs).toISOString(),
    status: "live"
  });
}

// supabase/functions/_shared/lib/listingCard.ts
async function toCard(ctx, listing) {
  const saleType = listing.saleType ?? "fixed";
  const [imageUrl, seller, auction, sellerPlan] = await Promise.all([
    listing.imageIds[0] ? ctx.storage.getUrl(listing.imageIds[0]) : null,
    ctx.db.get("users", listing.sellerId),
    saleType === "auction" ? getAuctionByListing(ctx, listing._id) : null,
    getPlan(ctx, listing.sellerId)
  ]);
  const sellerAvatarUrl = seller?.avatarStorageId ? await ctx.storage.getUrl(seller.avatarStorageId) : null;
  return {
    _id: listing._id,
    _creationTime: listing._creationTime,
    title: listing.title,
    description: listing.description.slice(0, 200),
    brand: listing.brand,
    size: listing.size,
    condition: listing.condition,
    category: listing.category,
    priceCents: listing.priceCents,
    status: listing.status,
    saleType,
    isLocked: !!listing.paywall,
    lockedKinds: [...new Set((listing.paywall?.media ?? []).map((m) => m.kind))],
    lockedPhotoCount: (listing.paywall?.media ?? []).filter((m) => m.kind === "image").length,
    lockedVideoSec: (() => {
      const vid = (listing.paywall?.media ?? []).find((m) => m.kind === "video");
      return vid ? Math.max(0, Math.round(Number(vid.durationSec ?? 0))) : null;
    })(),
    sellerUsername: seller?.username ?? null,
    auction: auction ? {
      endsAt: auction.endsAt,
      bidCount: auction.bidCount,
      status: auction.status
    } : null,
    imageUrl,
    sellerId: listing.sellerId,
    sellerName: seller ? publicSellerName(seller) : "Unknown seller",
    sellerIsPro: sellerPlan === "pro",
    sellerVerified: !!seller?.verified,
    sellerAvatarUrl,
    sellerCountry: seller?.sellerDetails?.country ?? null
  };
}

// supabase/functions/_shared/domain/accounts.ts
var BUYER_PHOTO_MAX = 5;
var PROFILE_PHOTO_PREVIEW = 6;
function capabilities(accountType, isPro, isAdmin, ageVerified) {
  if (isAdmin) return { post: true, message: true, list: true, buy: true };
  if (!ageVerified)
    return { post: false, message: false, list: false, buy: false };
  if (accountType === "buyer")
    return { post: true, message: true, list: false, buy: true };
  if (accountType === "seller")
    return { post: isPro, message: isPro, list: isPro, buy: false };
  return { post: false, message: false, list: false, buy: false };
}
var DENIED = {
  post: {
    buyer: "You can't post right now",
    seller: "Upgrade to Pro to post on the activity feed",
    none: "Choose an account type first"
  },
  message: {
    buyer: "You can't send messages right now",
    seller: "Upgrade to Pro to send and reply to messages",
    none: "Choose an account type first"
  },
  list: {
    buyer: "Buyer accounts can't create listings. Switch to a seller account to sell.",
    seller: "Upgrade to Pro to create listings",
    none: "Choose an account type first"
  },
  buy: {
    buyer: "You can't buy right now",
    seller: "Seller accounts can't buy. Use a buyer account to shop.",
    none: "Choose an account type first"
  }
};
var AGE_DENIED = "Verify your age (18+) first to do this";
function deniedMessage(action2, accountType, ageVerified = true) {
  if (!ageVerified) return AGE_DENIED;
  return DENIED[action2][accountType ?? "none"];
}

// supabase/functions/_shared/lib/access.ts
async function getCapabilities(ctx, user) {
  const isPro = await getPlan(ctx, user._id) === "pro";
  return capabilities(
    user.accountType,
    isPro,
    user.role === "admin",
    isAgeVerified(user.ageVerified)
  );
}
async function requireCapability(ctx, action2) {
  const user = await requireUser(ctx);
  const can = await getCapabilities(ctx, user);
  if (!can[action2]) {
    throw new AppError({
      code: "FORBIDDEN",
      message: deniedMessage(action2, user.accountType, isAgeVerified(user.ageVerified))
    });
  }
  return user;
}

// supabase/functions/_shared/domain/bidding.ts
var ANTI_SNIPE_MS = 2 * 60 * 1e3;
var MAX_BID_CENTS = 1e7;
var AUCTION_DURATIONS = [
  { hours: 1, label: "1 hour" },
  { hours: 24, label: "1 day" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" }
];
function isAllowedDuration(hours) {
  return AUCTION_DURATIONS.some((d) => d.hours === hours);
}
function bidIncrementCents(currentCents) {
  if (currentCents < 1e4) return 100;
  if (currentCents < 5e4) return 500;
  if (currentCents < 1e5) return 1e3;
  return 2500;
}
function minNextBidCents(auction) {
  return auction.bidCount === 0 ? auction.currentBidCents : auction.currentBidCents + bidIncrementCents(auction.currentBidCents);
}
function extendedEndsAtMs(endsAtMs, nowMs) {
  return endsAtMs - nowMs < ANTI_SNIPE_MS ? nowMs + ANTI_SNIPE_MS : endsAtMs;
}
function maskName(name) {
  const clean2 = name.trim();
  if (clean2.length <= 2) return `${clean2.slice(0, 1) || "?"}***`;
  return `${clean2.slice(0, 1)}***${clean2.slice(-1)}`;
}

// supabase/functions/_shared/modules/auctions.ts
var BID_HISTORY_LIMIT = 25;
var forListing = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const auction = await getAuctionByListing(ctx, listingId);
    if (!auction) return null;
    const [me, bids] = await Promise.all([
      getCurrentUserDoc(ctx),
      ctx.db.select(
        "bids",
        sql`where auction_id = ${auction._id}::uuid order by created_at desc, id desc limit ${BID_HISTORY_LIMIT}`
      )
    ]);
    const bidders = await Promise.all(
      bids.map((b) => ctx.db.get("users", b.bidderId))
    );
    return {
      _id: auction._id,
      status: auction.status,
      endsAt: auction.endsAt,
      startingBidCents: auction.startingBidCents,
      currentBidCents: auction.currentBidCents,
      bidCount: auction.bidCount,
      minNextBidCents: minNextBidCents(auction),
      incrementCents: bidIncrementCents(auction.currentBidCents),
      iAmHighBidder: !!me && auction.highBidderId === me._id,
      iWon: !!me && auction.status === "ended" && auction.highBidderId === me._id,
      bids: bids.map((b, i) => {
        const bidder = bidders[i];
        return {
          _id: b._id,
          _creationTime: b._creationTime,
          amountCents: b.amountCents,
          isMe: !!me && b.bidderId === me._id,
          bidderLabel: bidder ? maskName(publicSellerName(bidder)) : "Unknown"
        };
      })
    };
  }
});
var placeBid = mutation({
  args: { auctionId: v.id("auctions"), amountCents: v.number() },
  handler: async (ctx, { auctionId, amountCents }) => {
    const user = await requireCapability(ctx, "buy");
    const auction = await ctx.db.get("auctions", auctionId);
    if (!auction)
      throw new AppError({ code: "NOT_FOUND", message: "Auction not found" });
    const now = ctx.now();
    const endsAtMs = Date.parse(auction.endsAt);
    if (auction.status !== "live" || endsAtMs <= now)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "This auction has ended"
      });
    if (auction.sellerId === user._id)
      throw new AppError({
        code: "FORBIDDEN",
        message: "You can't bid on your own auction"
      });
    if (auction.highBidderId === user._id)
      throw new AppError({
        code: "CONFLICT",
        message: "You're already the highest bidder"
      });
    if (!Number.isInteger(amountCents) || amountCents > MAX_BID_CENTS)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Enter a valid bid amount"
      });
    const min = minNextBidCents(auction);
    if (amountCents < min)
      throw new AppError({
        code: "BAD_REQUEST",
        message: `Bid at least $${(min / 100).toFixed(2).replace(/\.00$/, "")}`
      });
    await ctx.db.insert("bids", { auctionId, bidderId: user._id, amountCents });
    const newEndsAtMs = extendedEndsAtMs(endsAtMs, now);
    await ctx.db.patch("auctions", auctionId, {
      currentBidCents: amountCents,
      bidCount: auction.bidCount + 1,
      highBidderId: user._id,
      endsAt: new Date(newEndsAtMs).toISOString()
    });
    await ctx.db.patch("listings", auction.listingId, {
      priceCents: amountCents
    });
    return { extended: newEndsAtMs !== endsAtMs };
  }
});
var closeDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const closed = await ctx.db.scalar(
      sql`select app.close_due_auctions(${new Date(ctx.now()).toISOString()}::timestamptz)`
    );
    return Number(closed);
  }
});
var relist = mutation({
  args: { listingId: v.id("listings"), durationHours: v.number() },
  handler: async (ctx, { listingId, durationHours }) => {
    const user = await requireUser(ctx);
    const listing = await ctx.db.get("listings", listingId);
    if (!listing || listing.sellerId !== user._id)
      throw new AppError({ code: "FORBIDDEN", message: "Not your listing" });
    if (listing.status !== "ended")
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Only unsold auctions can be relisted"
      });
    if (!isAllowedDuration(durationHours))
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Pick a valid duration"
      });
    if (await getPlan(ctx, user._id) !== "pro")
      throw new AppError({
        code: "FORBIDDEN",
        message: "Relisting auctions is a Pro feature"
      });
    const old = await getAuctionByListing(ctx, listingId);
    if (old) await ctx.db.delete("auctions", old._id);
    await createAuction(ctx, {
      listingId,
      sellerId: user._id,
      startingBidCents: old?.startingBidCents ?? listing.priceCents,
      durationHours
    });
    await ctx.db.patch("listings", listingId, { status: "active" });
    return null;
  }
});
var endingSoon = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const nowIso3 = new Date(ctx.now()).toISOString();
    const result = await ctx.db.paginate(
      "auctions",
      {
        // The closing job runs every minute; hide auctions that ended since its last run
        where: sql`status = 'live' and ends_at > ${nowIso3}::timestamptz`,
        order: [{ column: "ends_at", cast: "timestamptz" }],
        direction: "asc"
      },
      paginationOpts
    );
    const listings = await Promise.all(
      result.page.map((a) => ctx.db.get("listings", a.listingId))
    );
    return {
      ...result,
      page: await Promise.all(
        listings.flatMap((l) => l ? [toCard(ctx, l)] : [])
      )
    };
  }
});

// supabase/functions/_shared/modules/customRequests.ts
var customRequests_exports = {};
__export(customRequests_exports, {
  MAX_DETAILS: () => MAX_DETAILS,
  MAX_NOTE: () => MAX_NOTE,
  MAX_OPEN_PER_SELLER: () => MAX_OPEN_PER_SELLER,
  MAX_PRICE_CENTS: () => MAX_PRICE_CENTS2,
  MIN_PRICE_CENTS: () => MIN_PRICE_CENTS,
  assertCanAct: () => assertCanAct,
  assertPrice: () => assertPrice,
  create: () => create3,
  list: () => list3,
  partyOf: () => partyOf,
  respond: () => respond
});

// supabase/functions/_shared/modules/listings.ts
var listings_exports = {};
__export(listings_exports, {
  browse: () => browse,
  bySeller: () => bySeller,
  categoryValidator: () => categoryValidator,
  conditionValidator: () => conditionValidator,
  create: () => create2,
  generateUploadUrl: () => generateUploadUrl,
  get: () => get,
  landingCounts: () => landingCounts,
  listingStatusValidator: () => listingStatusValidator,
  mediaKindValidator: () => mediaKindValidator,
  remove: () => remove2,
  saleTypeValidator: () => saleTypeValidator,
  setStatus: () => setStatus,
  shopPage: () => shopPage,
  update: () => update
});

// supabase/functions/_shared/modules/orders.ts
var orders_exports = {};
__export(orders_exports, {
  CATEGORY_LABEL_SERVER: () => CATEGORY_LABEL_SERVER,
  _saveAddress: () => _saveAddress,
  _setShipTo: () => _setShipTo,
  _whoAmI: () => _whoAmI,
  actionCount: () => actionCount,
  addTracking: () => addTracking,
  addressValidator: () => addressValidator,
  buyerChoices: () => buyerChoices,
  cancel: () => cancel,
  confirmReceived: () => confirmReceived,
  createOrder: () => createOrder,
  forListing: () => forListing2,
  getOrderAs: () => getOrderAs,
  getSavedAddress: () => getSavedAddress,
  list: () => list2,
  liveOrderForListing: () => liveOrderForListing,
  myAddresses: () => myAddresses,
  saveAddress: () => saveAddress,
  sellListing: () => sellListing,
  setShipTo: () => setShipTo,
  storedAddressValidator: () => storedAddressValidator
});

// supabase/functions/_shared/domain/shipping.ts
var US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "PR",
  "AA",
  "AE",
  "AP"
];
function cleanAddress(raw2) {
  const t = (s) => (s ?? "").trim().replace(/\s+/g, " ");
  const name = t(raw2.name);
  const street1 = t(raw2.street1);
  const street2 = t(raw2.street2);
  const city = t(raw2.city);
  const state = t(raw2.state).toUpperCase();
  const zip = t(raw2.zip);
  const phone = t(raw2.phone).replace(/[^\d+]/g, "");
  if (name.length < 2 || name.length > 60) return { ok: false, message: "Enter the name for the label" };
  if (street1.length < 3 || street1.length > 80) return { ok: false, message: "Enter a street address or PO box" };
  if (street2.length > 80) return { ok: false, message: "Address line 2 is too long" };
  if (city.length < 2 || city.length > 60) return { ok: false, message: "Enter a city" };
  if (!US_STATES.includes(state)) return { ok: false, message: "Pick a state" };
  if (!/^\d{5}(-\d{4})?$/.test(zip)) return { ok: false, message: "Enter a 5-digit ZIP code" };
  if (phone && (phone.length < 10 || phone.length > 15)) return { ok: false, message: "Enter a valid phone number or leave it blank" };
  return {
    ok: true,
    address: {
      name,
      street1,
      ...street2 ? { street2 } : {},
      city,
      state,
      zip,
      country: "US",
      ...phone ? { phone } : {}
    }
  };
}
function cityLine(a) {
  return a ? `${a.city}, ${a.state}` : null;
}
var PACKAGE_PRESETS = [
  { id: "poly_small", label: "Small poly mailer (10 \xD7 13 in)", length: 13, width: 10, height: 1 },
  { id: "padded_envelope", label: "Padded envelope (9 \xD7 12 in)", length: 12, width: 9, height: 1 },
  { id: "poly_large", label: "Large poly mailer (14 \xD7 19 in)", length: 19, width: 14, height: 2 },
  { id: "small_box", label: "Small box (8 \xD7 6 \xD7 4 in)", length: 8, width: 6, height: 4 },
  { id: "shoe_box", label: "Shoe box (14 \xD7 10 \xD7 5 in)", length: 14, width: 10, height: 5 }
];
var MAX_WEIGHT_OZ = 70 * 16;
var CARRIERS = ["USPS", "UPS", "FedEx", "DHL"];
function carrierTrackingUrl(carrier, code) {
  const c2 = encodeURIComponent(code);
  switch (carrier.toUpperCase()) {
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${c2}`;
    case "UPS":
      return `https://www.ups.com/track?tracknum=${c2}`;
    case "FEDEX":
      return `https://www.fedex.com/fedextrack/?trknbr=${c2}`;
    case "DHL":
      return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${c2}`;
    default:
      return null;
  }
}
var IN_TRANSIT_STATUSES = /* @__PURE__ */ new Set([
  "in_transit",
  "out_for_delivery",
  "available_for_pickup",
  "return_to_sender",
  "failure"
]);

// supabase/functions/_shared/lib/easypost.ts
var BASE = "https://api.easypost.com/v2";
function apiKey() {
  const deno = globalThis.Deno;
  return deno?.env.get("EASYPOST_API_KEY")?.trim() || null;
}
function easyPostMode() {
  const key = apiKey();
  if (!key) return "missing";
  return key.startsWith("EZTK") ? "test" : "live";
}
var EasyPostRequestError = class extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "EasyPostRequestError";
  }
  status;
  code;
};
async function call(method, path, body) {
  const key = apiKey();
  if (!key) {
    throw new AppError({
      code: "BAD_REQUEST",
      message: "Shipping labels aren't set up yet. The site owner needs to add the EasyPost key."
    });
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${btoa(`${key}:`)}`,
      "Content-Type": "application/json"
    },
    body: body === void 0 ? void 0 : JSON.stringify(body)
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
  }
  if (!res.ok) {
    const err = json?.error;
    const detail = err?.errors?.map((e) => e.message).filter(Boolean).join("; ");
    throw new EasyPostRequestError(
      res.status,
      err?.code ?? `HTTP_${res.status}`,
      [err?.message, detail].filter(Boolean).join(": ") || `EasyPost error ${res.status}`
    );
  }
  return json;
}
var toEp = (a) => ({
  name: a.name,
  street1: a.street1,
  street2: a.street2 ?? "",
  city: a.city,
  state: a.state,
  zip: a.zip,
  country: a.country,
  phone: a.phone ?? ""
});
async function verifyAddress(a) {
  const res = await call("POST", "/addresses", {
    address: { ...toEp(a), verify: ["delivery"] }
  });
  const delivery = res.verifications?.delivery;
  if (!delivery?.success) {
    const why = delivery?.errors?.map((e) => e.message).filter(Boolean)[0];
    throw new AppError({
      code: "BAD_REQUEST",
      message: why ? `We couldn't verify that address: ${why}` : "We couldn't verify that address. Check the street, city and ZIP."
    });
  }
  return {
    name: a.name,
    street1: res.street1 || a.street1,
    ...res.street2 || a.street2 ? { street2: res.street2 || a.street2 } : {},
    city: res.city || a.city,
    state: res.state || a.state,
    zip: res.zip || a.zip,
    country: "US",
    ...a.phone ? { phone: a.phone } : {}
  };
}
async function createShipment(input) {
  return await call("POST", "/shipments", {
    shipment: {
      from_address: toEp(input.from),
      to_address: toEp(input.to),
      parcel: {
        length: input.parcel.length,
        width: input.parcel.width,
        height: input.parcel.height,
        weight: input.parcel.weightOz
      },
      options: { label_format: "PDF", label_size: "4x6" },
      reference: input.reference
    }
  });
}
async function getShipment(id) {
  return await call("GET", `/shipments/${encodeURIComponent(id)}`);
}
async function buyShipment(id, rateId) {
  try {
    return await call("POST", `/shipments/${encodeURIComponent(id)}/buy`, {
      rate: { id: rateId }
    });
  } catch (e) {
    if (!(e instanceof EasyPostRequestError)) throw e;
    const existing = await getShipment(id).catch(() => null);
    if (existing?.postage_label) return existing;
    throw e;
  }
}
async function refundShipment(id) {
  return await call("POST", `/shipments/${encodeURIComponent(id)}/refund`);
}
async function getTracker(id) {
  return await call("GET", `/trackers/${encodeURIComponent(id)}`);
}
function labelUrlOf(s) {
  return s.postage_label?.label_pdf_url || s.postage_label?.label_url || null;
}
function toCents(rate) {
  if (!rate) return void 0;
  const n = Math.round(Number(rate) * 100);
  return Number.isFinite(n) ? n : void 0;
}
function shippingError(e, fallback) {
  if (e instanceof AppError) return e;
  if (e instanceof EasyPostRequestError) {
    console.error("EasyPost", e.status, e.code, e.message);
    if (e.status === 401 || e.status === 403)
      return new AppError({ code: "INTERNAL", message: "Shipping is misconfigured. Please contact support." });
    if (e.code.includes("PAYMENT") || /insufficient|balance|funds/i.test(e.message))
      return new AppError({ code: "CONFLICT", message: "Labels are paused right now (postage account needs funds). Please try again later." });
    return new AppError({ code: "BAD_REQUEST", message: `${fallback}: ${e.message}` });
  }
  console.error(fallback, e);
  return new AppError({ code: "INTERNAL", message: fallback });
}

// supabase/functions/_shared/domain/sellerSettings.ts
var PAYMENT_METHODS = [
  "PayPal",
  "Cash App",
  "Venmo",
  "Zelle",
  "Bank transfer",
  "Wise",
  "Revolut",
  "Crypto",
  "Gift cards"
];
var OFFERINGS = [
  "Used panties",
  "Used bras",
  "Used lingerie",
  "Used socks & hosiery",
  "Used shoes",
  "Used gym clothes",
  "Used clothing",
  "Used sex toys",
  "Photo sets",
  "Video clips",
  "Feet pics",
  "Custom requests",
  "Sexting",
  "Dick ratings",
  "Experiences"
];
var YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" }
];
var SETTING_FIELDS = [
  {
    key: "profilePrivate",
    label: "Set Profile to Private",
    choices: [
      { value: "no", label: "No - Keep my profile visible" },
      { value: "yes", label: "Yes - Make my profile private" }
    ],
    defaultValue: "no",
    hint: "A private profile can only be seen by you. Everyone else sees that it's private. Your listings can still be found and bought."
  },
  {
    key: "siteVisibility",
    label: "Site Visibility",
    choices: [
      { value: "all", label: "All our sites - Maximise sales potential" },
      { value: "this", label: "This site only" }
    ],
    defaultValue: "all",
    hint: "Select whether your profile appears on all our sister sites or only on this one.",
    comingSoon: true
  },
  {
    key: "emailNotifications",
    label: "Platform Email Notifications",
    choices: YES_NO,
    defaultValue: "yes",
    hint: "Get some platform notifications by email, for example when you receive a message. To reduce spam, we only send you a new email notification once every 6 hours.",
    comingSoon: true
  },
  {
    key: "marketingEmails",
    label: "Marketing Emails",
    choices: YES_NO,
    defaultValue: "no",
    hint: "Get promotional emails such as newsletters, offers and information about new product features."
  },
  {
    key: "webPush",
    label: "Web Push Notifications",
    choices: YES_NO,
    defaultValue: "no",
    hint: "Get instant notifications in your browser.",
    comingSoon: true
  },
  {
    key: "messagesFrom",
    label: "Receive Messages From All Buyers",
    choices: [
      { value: "all", label: "Yes - Allow messages from all buyers" },
      { value: "existing", label: "No - Only buyers already talking to me" }
    ],
    defaultValue: "all",
    hint: "Choose No to stop new conversations. Buyers you're already talking to can still message you."
  },
  {
    key: "socialFeature",
    label: "Be Featured on our Social Media",
    choices: [
      { value: "no", label: "No - I do not want extra exposure" },
      { value: "yes", label: "Yes - Feature me for extra exposure" }
    ],
    defaultValue: "no",
    hint: "Get more exposure by being featured on our social media platforms."
  }
];
function withDefaults(settings) {
  const out = { paymentMethods: settings?.paymentMethods ?? [], offerings: settings?.offerings ?? [] };
  for (const f of SETTING_FIELDS) {
    out[f.key] = settings?.[f.key] ?? f.defaultValue;
  }
  return out;
}
function invalidSetting(settings) {
  for (const f of SETTING_FIELDS) {
    const value = settings[f.key];
    if (value !== void 0 && !f.choices.some((c2) => c2.value === value))
      return `Invalid choice for ${f.label}`;
  }
  const lists = [
    ["payment method", PAYMENT_METHODS, settings.paymentMethods],
    ["offering", OFFERINGS, settings.offerings]
  ];
  for (const [name, allowed, chosen] of lists) {
    if (chosen?.some((x) => !allowed.includes(x))) return `Invalid ${name}`;
  }
  return null;
}
var acceptsNewMessages = (settings) => (settings?.messagesFrom ?? "all") !== "existing";

// supabase/functions/_shared/lib/email.ts
var SITE_FALLBACK = "https://taboo-desires.vercel.app";
function siteUrl() {
  const deno = globalThis.Deno;
  return (deno?.env.get("SITE_URL")?.trim() || SITE_FALLBACK).replace(/\/+$/, "");
}
var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function renderEmail(opts) {
  const url = opts.button ? `${siteUrl()}${opts.button.path}` : null;
  const html = `<!doctype html><html><body style="margin:0;background:#0C0F15;padding:24px;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#202227;border-radius:5px;padding:28px;">
<tr><td style="color:#ffffff;font-size:20px;font-weight:bold;padding-bottom:12px;">${esc(opts.heading)}</td></tr>
${opts.lines.map((l) => `<tr><td style="color:#ffffff;font-size:14px;line-height:1.6;padding-bottom:10px;">${esc(l)}</td></tr>`).join("")}
${url ? `<tr><td style="padding:12px 0;"><a href="${esc(url)}" style="background:#7b3aec;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:5px;font-size:14px;display:inline-block;">${esc(opts.button.label)}</a></td></tr>` : ""}
<tr><td style="color:#ffffff;font-size:12px;padding-top:14px;opacity:.7;">${opts.footer ? esc(opts.footer) : `You get this because of your Taboo Desires account. Turn these emails off any time in your settings: ${esc(siteUrl())}/settings`}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [opts.heading, "", ...opts.lines, ...url ? ["", `${opts.button.label}: ${url}`] : [], "", opts.footer ?? `Turn these emails off in your settings: ${siteUrl()}/settings`].join("\n");
  return { html, text };
}
async function queueEmail(ctx, a) {
  if (!a.to.email) return;
  if (!a.transactional && withDefaults(a.to.settings).emailNotifications === "no") return;
  const { html, text } = renderEmail(a);
  await ctx.db.rows(sql`
    insert into public.email_outbox (user_id, to_email, reply_to, kind, subject, html, text_body, dedupe_key)
    values (${a.to._id}::uuid, ${a.to.email}, ${a.replyTo ?? null}, ${a.kind}, ${a.subject.slice(0, 200)}, ${html}, ${text}, ${a.dedupeKey})
    on conflict (dedupe_key) do nothing
  `);
}
async function queueEmailToAddress(ctx, a) {
  const { html, text } = renderEmail(a);
  await ctx.db.rows(sql`
    insert into public.email_outbox (user_id, to_email, reply_to, kind, subject, html, text_body, dedupe_key)
    values (null, ${a.toEmail}, ${a.replyTo ?? null}, ${a.kind}, ${a.subject.replace(/\s+/g, " ").slice(0, 200)}, ${html}, ${text}, ${a.dedupeKey})
    on conflict (dedupe_key) do nothing
  `);
}
function reportInbox() {
  const deno = globalThis.Deno;
  return deno?.env.get("REPORT_EMAIL_TO")?.trim() || "report.content@taboodesiers.com";
}
var SIX_HOURS = 6 * 60 * 60 * 1e3;
function throttleKey(ctx, kind, userId, extra = "") {
  return `${kind}:${userId}:${extra}:${Math.floor(ctx.now() / SIX_HOURS)}`;
}

// supabase/functions/_shared/modules/orders.ts
var addressValidator = v.object({
  name: v.string(),
  street1: v.string(),
  street2: v.optional(v.string()),
  city: v.string(),
  state: v.string(),
  zip: v.string(),
  phone: v.optional(v.string())
});
var storedAddressValidator = v.object({
  name: v.string(),
  street1: v.string(),
  street2: v.optional(v.string()),
  city: v.string(),
  state: v.string(),
  zip: v.string(),
  country: v.literal("US"),
  phone: v.optional(v.string())
});
var roleValidator = v.union(v.literal("buyer"), v.literal("seller"));
var kindValidator = v.union(v.literal("ship_to"), v.literal("ship_from"));
var CATEGORY_LABEL_SERVER = {
  panties: "Panties",
  bras: "Bra",
  lingerie: "Lingerie",
  socks: "Socks",
  shoes: "Shoes",
  activewear: "Activewear",
  clothing: "Clothing",
  extras: "Extras",
  custom: "Custom item"
};
var nowIso = (ctx) => new Date(ctx.now()).toISOString();
var OPEN = /* @__PURE__ */ new Set(["awaiting_address", "ready_to_ship"]);
async function getOrderAs(ctx, orderId, role, opts = {}) {
  const me = role === "seller" && opts.pro ? await requireCapability(ctx, "list") : await requireUser(ctx);
  const order = await ctx.db.get("orders", orderId);
  const mine6 = order && (role === "seller" ? order.sellerId : order.buyerId) === me._id;
  if (!order || !mine6)
    throw new AppError({ code: "NOT_FOUND", message: "Order not found" });
  return { order, me };
}
async function getSavedAddress(ctx, userId, kind) {
  const row = await ctx.db.first(
    "shippingAddresses",
    sql`where user_id = ${userId}::uuid and kind = ${kind}`
  );
  return row?.address ?? null;
}
async function saveAddressRow(ctx, userId, kind, address) {
  const existing = await ctx.db.first(
    "shippingAddresses",
    sql`where user_id = ${userId}::uuid and kind = ${kind}`
  );
  if (existing)
    await ctx.db.patch("shippingAddresses", existing._id, { address, updatedAt: nowIso(ctx) });
  else
    await ctx.db.insert("shippingAddresses", { userId, kind, address, updatedAt: nowIso(ctx) });
}
async function createOrder(ctx, fields) {
  const shipTo = await getSavedAddress(ctx, fields.buyerId, "ship_to");
  const title = fields.title.slice(0, 120) || "Order";
  const id = await ctx.db.insert("orders", {
    ...fields,
    title,
    status: shipTo ? "ready_to_ship" : "awaiting_address",
    shipTo: shipTo ?? void 0,
    updatedAt: nowIso(ctx)
  });
  const [buyer, seller] = await Promise.all([
    ctx.db.get("users", fields.buyerId),
    ctx.db.get("users", fields.sellerId)
  ]);
  if (buyer)
    await queueEmail(ctx, {
      to: buyer,
      kind: "order_placed",
      transactional: true,
      subject: `Your order: ${title}`,
      heading: "Thanks for your order",
      lines: [
        `Your order for "${title}" is placed with ${seller ? publicSellerName(seller) : "the seller"}.`,
        shipTo ? "We have your shipping address on file." : "Add your shipping address so the seller can ship it."
      ],
      button: { label: "View order", path: "/orders" },
      dedupeKey: `order_buyer:${id}`
    });
  if (seller)
    await queueEmail(ctx, {
      to: seller,
      kind: "order_received",
      transactional: true,
      subject: `New order: ${title}`,
      heading: "You have a new order",
      lines: [`You have a new order for "${title}".`],
      button: { label: "View order", path: "/orders" },
      dedupeKey: `order_seller:${id}`
    });
  return id;
}
async function liveOrderForListing(ctx, listingId) {
  return await ctx.db.first(
    "orders",
    sql`where listing_id = ${listingId}::uuid and status <> 'cancelled'`
  );
}
async function toView(ctx, o, role) {
  const [other, listing] = await Promise.all([
    ctx.db.get("users", role === "buyer" ? o.sellerId : o.buyerId),
    o.listingId ? ctx.db.get("listings", o.listingId) : null
  ]);
  const imageId = listing?.imageIds[0];
  return {
    _id: o._id,
    role,
    title: o.title,
    status: o.status,
    createdAt: o._creationTime,
    updatedAt: o.updatedAt,
    listingId: o.listingId ?? null,
    customRequestId: o.customRequestId ?? null,
    imageUrl: imageId ? await ctx.storage.getUrl(imageId) : null,
    other: other ? {
      _id: other._id,
      name: role === "buyer" ? publicSellerName(other) : other.name || "Anonymous buyer",
      avatarUrl: other.avatarStorageId ? await ctx.storage.getUrl(other.avatarStorageId) : null
    } : null,
    /** Full address only for the buyer; the seller sees it on the label */
    shipTo: role === "buyer" ? o.shipTo ?? null : null,
    shipsTo: cityLine(o.shipTo),
    carrier: o.carrier ?? null,
    service: o.service ?? null,
    postageCents: role === "seller" ? o.postageCents ?? null : null,
    trackingCode: o.trackingCode ?? null,
    trackingUrl: o.trackingUrl ?? null,
    trackingStatus: o.trackingStatus ?? null,
    hasLabel: !!o.labelUrl,
    labelUrl: role === "seller" ? o.labelUrl ?? null : null,
    labelCreatedAt: o.labelCreatedAt ?? null,
    shippedAt: o.shippedAt ?? null,
    deliveredAt: o.deliveredAt ?? null
  };
}
var list2 = query({
  args: { role: roleValidator, paginationOpts: paginationOptsValidator },
  handler: async (ctx, { role, paginationOpts }) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db.paginate(
      "orders",
      {
        where: role === "buyer" ? sql`buyer_id = ${me._id}::uuid` : sql`seller_id = ${me._id}::uuid`,
        order: [{ column: "updated_at", cast: "timestamptz" }],
        direction: "desc"
      },
      paginationOpts
    );
    return {
      ...result,
      page: await Promise.all(result.page.map((o) => toView(ctx, o, role)))
    };
  }
});
var actionCount = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return 0;
    ctx.db.touch("orders");
    return Number(
      await ctx.db.scalar(sql`
        select count(*)::int from public.orders
         where (buyer_id = ${me._id}::uuid and status = 'awaiting_address')
            or (seller_id = ${me._id}::uuid and status in ('ready_to_ship', 'label_created'))`)
    );
  }
});
var forListing2 = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const me = await getCurrentUserDoc(ctx);
    const listing = await ctx.db.get("listings", listingId);
    if (!me || !listing || listing.sellerId !== me._id) return null;
    const order = await liveOrderForListing(ctx, listingId);
    return order ? await toView(ctx, order, "seller") : null;
  }
});
var buyerChoices = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const me = await getCurrentUserDoc(ctx);
    const listing = await ctx.db.get("listings", listingId);
    if (!me || !listing || listing.sellerId !== me._id) return [];
    ctx.db.touch("conversations", "users");
    const rows = await ctx.db.rows(sql`
      select u.id, u.name, u.avatar_storage_id,
             bool_or(c.listing_id = ${listingId}::uuid) as asked_about_it,
             max(c.last_message_at) as last_at
        from public.conversations c
        join public.users u on u.id = c.buyer_id
       where c.seller_id = ${me._id}::uuid
       group by u.id
       order by bool_or(c.listing_id = ${listingId}::uuid) desc, max(c.last_message_at) desc
       limit 30`);
    return await Promise.all(
      rows.map(async (r) => ({
        _id: String(r.id),
        name: r.name || "Anonymous buyer",
        avatarUrl: r.avatar_storage_id ? await ctx.storage.getUrl(r.avatar_storage_id) : null,
        askedAboutIt: r.asked_about_it === true || r.asked_about_it === "t"
      }))
    );
  }
});
var myAddresses = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return { shipTo: null, shipFrom: null };
    const [shipTo, shipFrom] = await Promise.all([
      getSavedAddress(ctx, me._id, "ship_to"),
      getSavedAddress(ctx, me._id, "ship_from")
    ]);
    return { shipTo, shipFrom };
  }
});
var sellListing = mutation({
  args: { listingId: v.id("listings"), buyerId: v.optional(v.id("users")) },
  handler: async (ctx, { listingId, buyerId }) => {
    const me = await requireUser(ctx);
    const listing = await ctx.db.get("listings", listingId);
    if (!listing) throw new AppError({ code: "NOT_FOUND", message: "Listing not found" });
    if (listing.sellerId !== me._id)
      throw new AppError({ code: "FORBIDDEN", message: "Not your listing" });
    if (listing.saleType === "auction")
      throw new AppError({ code: "BAD_REQUEST", message: "Auctions close automatically" });
    if (listing.status !== "active")
      throw new AppError({ code: "CONFLICT", message: "This listing is already sold" });
    let orderId = null;
    if (buyerId) {
      const talked = await ctx.db.scalar(sql`
        select 1 from public.conversations
         where seller_id = ${me._id}::uuid and buyer_id = ${buyerId}::uuid limit 1`);
      if (!talked)
        throw new AppError({
          code: "BAD_REQUEST",
          message: "You can only sell to a buyer who has messaged you"
        });
      orderId = await createOrder(ctx, {
        sellerId: me._id,
        buyerId,
        listingId,
        title: listing.title
      });
    }
    await ctx.db.patch("listings", listingId, { status: "sold" });
    await bumpStats(ctx, me._id, { salesCount: 1 });
    return orderId;
  }
});
var cancel = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const me = await requireUser(ctx);
    const order = await ctx.db.get("orders", orderId);
    if (!order || order.buyerId !== me._id && order.sellerId !== me._id)
      throw new AppError({ code: "NOT_FOUND", message: "Order not found" });
    if (!OPEN.has(order.status))
      throw new AppError({
        code: "CONFLICT",
        message: order.status === "label_created" ? "Void the shipping label first" : "This order can't be cancelled anymore"
      });
    await ctx.db.patch("orders", orderId, { status: "cancelled", updatedAt: nowIso(ctx) });
    return null;
  }
});
var addTracking = mutation({
  args: {
    orderId: v.id("orders"),
    carrier: v.string(),
    trackingCode: v.string()
  },
  handler: async (ctx, { orderId, carrier, trackingCode }) => {
    const { order } = await getOrderAs(ctx, orderId, "seller");
    if (order.status !== "ready_to_ship" && order.status !== "awaiting_address")
      throw new AppError({ code: "CONFLICT", message: "This order already has tracking" });
    const code = trackingCode.replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z0-9]{8,40}$/.test(code))
      throw new AppError({ code: "BAD_REQUEST", message: "Enter a valid tracking number" });
    if (!CARRIERS.includes(carrier))
      throw new AppError({ code: "BAD_REQUEST", message: "Pick a carrier" });
    const now = nowIso(ctx);
    await ctx.db.patch("orders", orderId, {
      status: "shipped",
      carrier,
      trackingCode: code,
      trackingUrl: carrierTrackingUrl(carrier, code) ?? void 0,
      shippedAt: now,
      updatedAt: now
    });
    return null;
  }
});
var confirmReceived = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const { order } = await getOrderAs(ctx, orderId, "buyer");
    if (order.status !== "shipped" && order.status !== "label_created")
      throw new AppError({ code: "CONFLICT", message: "This order hasn't shipped yet" });
    const now = nowIso(ctx);
    await ctx.db.patch("orders", orderId, {
      status: "delivered",
      deliveredAt: now,
      updatedAt: now
    });
    return null;
  }
});
function clean(raw2) {
  const result = cleanAddress(raw2);
  if (!result.ok) throw new AppError({ code: "BAD_REQUEST", message: result.message });
  return result.address;
}
async function verified(raw2) {
  try {
    return await verifyAddress(clean(raw2));
  } catch (e) {
    throw shippingError(e, "Couldn't check that address");
  }
}
var _whoAmI = internalMutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    return { _id: me._id, accountType: me.accountType ?? null, role: me.role ?? null };
  }
});
var _setShipTo = internalMutation({
  args: {
    orderId: v.id("orders"),
    address: storedAddressValidator,
    saveAsDefault: v.boolean()
  },
  handler: async (ctx, { orderId, address, saveAsDefault }) => {
    const { order, me } = await getOrderAs(ctx, orderId, "buyer");
    if (!OPEN.has(order.status))
      throw new AppError({
        code: "CONFLICT",
        message: "The label is already made, so the address can't change. Message the seller."
      });
    await ctx.db.patch("orders", orderId, {
      shipTo: address,
      status: "ready_to_ship",
      // A new address makes any rates the seller fetched stale
      easypostShipmentId: void 0,
      updatedAt: nowIso(ctx)
    });
    if (saveAsDefault) await saveAddressRow(ctx, me._id, "ship_to", address);
    return null;
  }
});
var setShipTo = action({
  args: {
    orderId: v.id("orders"),
    address: addressValidator,
    saveAsDefault: v.boolean()
  },
  handler: async (ctx, { orderId, address, saveAsDefault }) => {
    await ctx.runMutation(_whoAmI, {});
    const checked = await verified(address);
    await ctx.runMutation(_setShipTo, { orderId, address: checked, saveAsDefault });
    return checked;
  }
});
var _saveAddress = internalMutation({
  args: { kind: kindValidator, address: storedAddressValidator },
  handler: async (ctx, { kind, address }) => {
    const me = await requireUser(ctx);
    await saveAddressRow(ctx, me._id, kind, address);
    return null;
  }
});
var saveAddress = action({
  args: { kind: kindValidator, address: addressValidator },
  handler: async (ctx, { kind, address }) => {
    const me = await ctx.runMutation(_whoAmI, {});
    const isSeller = me.accountType === "seller" || me.role === "admin";
    const isBuyer = me.accountType === "buyer" || me.role === "admin";
    if (kind === "ship_from" && !isSeller)
      throw new AppError({ code: "FORBIDDEN", message: "Only sellers have a return address" });
    if (kind === "ship_to" && !isBuyer)
      throw new AppError({ code: "FORBIDDEN", message: "Only buyers have a shipping address" });
    const checked = await verified(address);
    await ctx.runMutation(_saveAddress, { kind, address: checked });
    return checked;
  }
});

// supabase/functions/_shared/domain/enums.ts
var CATEGORIES = [
  "panties",
  "bras",
  "lingerie",
  "socks",
  "shoes",
  "activewear",
  "clothing",
  "extras",
  "custom"
];
var CONDITIONS = [
  "one_day",
  "two_three_days",
  "week",
  "custom_wear"
];
var LISTING_STATUSES = ["active", "sold", "ended", "hidden"];
var SALE_TYPES = ["fixed", "auction"];
var MEDIA_KINDS = ["image", "video"];

// supabase/functions/_shared/lib/files.ts
function assertOwnFiles(ids, userId, visibility, alreadyAttached = []) {
  for (const id of ids) {
    if (alreadyAttached.includes(id)) continue;
    if (!isOwnFile(id, userId, visibility)) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "A file is missing. Please upload it again"
      });
    }
  }
}

// supabase/functions/_shared/lib/lockedContent.ts
async function getUnlock(ctx, listingId, buyerId) {
  return await ctx.db.first(
    "unlocks",
    sql`where listing_id = ${listingId}::uuid and buyer_id = ${buyerId}::uuid`
  );
}
var UNLOCK_HOURS = 24;
function unlockExpiry(unlock) {
  if (unlock?.status !== "granted" || !unlock.grantedAt) return null;
  return new Date(unlock.grantedAt).getTime() + UNLOCK_HOURS * 36e5;
}
async function canViewLocked(ctx, listing, user) {
  if (!listing.paywall || !user) return false;
  if (listing.sellerId === user._id) return true;
  const expiry = unlockExpiry(await getUnlock(ctx, listing._id, user._id));
  return expiry !== null && expiry > ctx.now();
}
async function validateLockedMedia(ctx, sellerId, media, coverCount, alreadyAttached = []) {
  const bad3 = (message) => new AppError({ code: "BAD_REQUEST", message });
  if (media.length < 1) throw bad3("Add at least one photo or a video");
  const videos = media.filter((m) => m.kind === "video").length;
  if (videos > 1) throw bad3("Add only one video");
  if (videos === 1 && media.length > 1)
    throw bad3("A video listing holds just the video and its thumbnail");
  if (media.length > LOCKED_MEDIA_MAX)
    throw bad3(`Instant Content can hold up to ${LOCKED_MEDIA_MAX} photos`);
  if (coverCount !== 1) throw bad3("Add a cover photo");
  assertOwnFiles(
    media.map((m) => m.storageId),
    sellerId,
    "private",
    alreadyAttached
  );
  const types = await Promise.all(
    media.map((m) => ctx.storage.getContentType(m.storageId))
  );
  types.forEach((type, i) => {
    if (type === void 0)
      throw bad3("A file is missing. Please upload it again");
    if (type && !type.startsWith(`${media[i].kind}/`))
      throw bad3("Unsupported file type");
  });
}

// supabase/functions/_shared/lib/listingDelete.ts
async function deleteListingCascade(ctx, listing) {
  listing.imageIds.forEach((id) => ctx.storage.delete(id));
  listing.paywall?.media.forEach((m) => ctx.storage.delete(m.storageId));
  await ctx.db.delete("listings", listing._id);
}

// supabase/functions/_shared/domain/sellerDetails.ts
var range = (from, to, step = 1, suffix = "") => Array.from(
  { length: Math.floor((to - from) / step) + 1 },
  (_, i) => `${from + i * step}${suffix}`
);
var HEIGHTS = Array.from({ length: 25 }, (_, i) => {
  const inches = 56 + i;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
});
var YES_NO_SOMETIMES = ["Yes", "No", "Sometimes"];
var SELLER_DETAIL_FIELDS = [
  {
    key: "country",
    label: "Country",
    options: [
      "United States",
      "Canada",
      "United Kingdom",
      "Ireland",
      "Australia",
      "New Zealand",
      "Germany",
      "France",
      "Spain",
      "Italy",
      "Netherlands",
      "Belgium",
      "Sweden",
      "Norway",
      "Denmark",
      "Finland",
      "Poland",
      "Portugal",
      "Austria",
      "Switzerland",
      "Czech Republic",
      "Mexico",
      "Brazil",
      "Argentina",
      "Colombia",
      "Chile",
      "South Africa",
      "Japan",
      "South Korea",
      "Philippines",
      "Thailand",
      "India",
      "Other"
    ],
    primary: true
  },
  {
    key: "ageRange",
    label: "Age",
    options: ["18-20", "21-25", "26-30", "30-40", "40-50", "50+", "60+", "70+"],
    primary: true
  },
  {
    key: "gender",
    label: "Gender",
    options: [
      "Female",
      "Male",
      "Trans woman",
      "Trans man",
      "Non-binary",
      "Other"
    ],
    primary: true
  },
  {
    key: "ethnicity",
    label: "Ethnicity",
    options: [
      "Caucasian (White)",
      "Black",
      "Hispanic / Latina",
      "Asian",
      "Middle Eastern",
      "Native American",
      "Pacific Islander",
      "Mixed",
      "Other"
    ]
  },
  {
    key: "bodySize",
    label: "Body size",
    options: [
      "Petite",
      "Slim",
      "Athletic",
      "Average",
      "Curvy",
      "Muscular",
      "Plus size",
      "BBW"
    ]
  },
  { key: "shoeSize", label: "Shoe size (US)", options: [...range(4, 15.5, 0.5), "16+"] },
  {
    key: "showFace",
    label: "Will show face",
    options: ["Yes", "No", "Sometimes"],
    hint: "Are you willing to show your face?"
  },
  {
    key: "occupation",
    label: "Occupation",
    options: [
      "Student",
      "Office worker",
      "Healthcare",
      "Fitness / Trainer",
      "Hospitality",
      "Retail",
      "Teacher",
      "Creative / Artist",
      "Model",
      "Self-employed",
      "Stay at home",
      "Military / Police",
      "Blue collar worker",
      "Digital nomad / Tech",
      "Other"
    ]
  },
  { key: "tattoos", label: "Tattoos", options: ["None", "A few", "Many"] },
  {
    key: "piercings",
    label: "Piercings",
    options: ["None", "Ears only", "A few", "Many"]
  },
  {
    key: "hairColor",
    label: "Hair color",
    options: [
      "Blonde",
      "Brunette",
      "Black",
      "Red",
      "Auburn",
      "Gray",
      "White",
      "Blue",
      "Pink",
      "Purple",
      "Green",
      "Dyed / Colorful",
      "Bald"
    ]
  },
  {
    key: "eyeColor",
    label: "Eye color",
    options: ["Brown", "Blue", "Green", "Hazel", "Gray", "Amber", "Other"]
  },
  { key: "smokes", label: "Smokes", options: YES_NO_SOMETIMES },
  { key: "drinks", label: "Drinks", options: YES_NO_SOMETIMES },
  { key: "height", label: "Height", options: HEIGHTS },
  {
    key: "relationshipStatus",
    label: "Relationship status",
    options: [
      "Single",
      "In a relationship",
      "Married",
      "Divorced",
      "Open relationship",
      "Widowed",
      "It's complicated",
      "Prefer not to say"
    ]
  },
  { key: "pregnant", label: "Pregnant", options: ["Yes", "No"] }
];
var SELLER_DETAIL_KEYS = SELLER_DETAIL_FIELDS.map((f) => f.key);
function invalidSellerDetail(details) {
  for (const field of SELLER_DETAIL_FIELDS) {
    const value = details[field.key];
    if (value !== void 0 && !field.options.includes(value)) {
      return `Invalid ${field.label.toLowerCase()}`;
    }
  }
  return null;
}

// supabase/functions/_shared/domain/subcategories.ts
var SUBCATEGORIES = [
  { value: "panties", label: "Panties", category: "panties", isDefault: true },
  { value: "thongs", label: "Thongs", category: "panties" },
  { value: "bras", label: "Bras", category: "bras", isDefault: true },
  { value: "lingerie", label: "Lingerie", category: "lingerie", isDefault: true },
  { value: "socks", label: "Socks", category: "socks", isDefault: true },
  { value: "pantyhose", label: "Pantyhose", category: "socks" },
  { value: "stockings", label: "Stockings", category: "socks" },
  { value: "high_heels", label: "High heels", category: "shoes" },
  { value: "flats", label: "Flat shoes", category: "shoes" },
  { value: "sneakers", label: "Sneakers", category: "shoes" },
  { value: "slippers", label: "Slippers", category: "shoes" },
  { value: "uniform_shoes", label: "Uniform shoes", category: "shoes" },
  { value: "boots", label: "Boots", category: "shoes" },
  { value: "gym_clothes", label: "Gym clothes", category: "activewear", isDefault: true },
  { value: "skirts", label: "Skirts", category: "clothing" },
  { value: "dresses", label: "Dresses", category: "clothing" },
  { value: "tops", label: "Tops", category: "clothing" },
  { value: "swimwear", label: "Swimwear", category: "clothing" },
  { value: "other_clothing", label: "Other clothing", category: "clothing", isDefault: true },
  { value: "accessories", label: "Accessories", category: "extras" },
  { value: "photo_sets", label: "Photo sets", category: "extras" },
  { value: "video_clips", label: "Video clips", category: "extras" },
  { value: "feet_pics", label: "Feet pics", category: "extras" },
  { value: "experiences", label: "Experiences", category: "extras" },
  { value: "dick_ratings", label: "Dick ratings", category: "extras" },
  { value: "sex_toys", label: "Sex toys", category: "extras" },
  { value: "sexting", label: "Sexting", category: "extras" }
];
var SUBCATEGORY_VALUES = SUBCATEGORIES.map((s) => s.value);
function subcategoryInfo(value) {
  return SUBCATEGORIES.find((s) => s.value === value);
}

// supabase/functions/_shared/modules/listings.ts
var MAX_PRICE_CENTS = 1e7;
var categoryValidator = v.union(
  ...CATEGORIES.map((c2) => v.literal(c2))
);
var conditionValidator = v.union(
  ...CONDITIONS.map((c2) => v.literal(c2))
);
var listingStatusValidator = v.union(
  ...LISTING_STATUSES.map((s) => v.literal(s))
);
var saleTypeValidator = v.union(
  ...SALE_TYPES.map((s) => v.literal(s))
);
var mediaKindValidator = v.union(
  ...MEDIA_KINDS.map((k) => v.literal(k))
);
var listingFields = {
  title: v.string(),
  description: v.string(),
  category: categoryValidator,
  subcategory: v.optional(v.union(...SUBCATEGORY_VALUES.map((s) => v.literal(s)))),
  brand: v.string(),
  size: v.string(),
  condition: conditionValidator,
  priceCents: v.number(),
  imageIds: v.array(v.storageId(), 20),
  // Paywalled listing: original files; imageIds then hold their blurred previews
  locked: v.optional(
    v.array(
      v.object({ storageId: v.storageId(), kind: mediaKindValidator, durationSec: v.optional(v.number()) }),
      20
    )
  )
};
function validateListing(input) {
  const bad3 = (message) => new AppError({ code: "BAD_REQUEST", message });
  if (input.title.trim().length < 3 || input.title.length > 80)
    throw bad3("Title must be 3-80 characters");
  if (input.description.length > 2e3) throw bad3("Description is too long");
  if (!input.brand.trim()) throw bad3("Brand is required");
  if (!input.size.trim()) throw bad3("Size is required");
  if (!Number.isInteger(input.priceCents) || input.priceCents < 100 || input.priceCents > MAX_PRICE_CENTS)
    throw bad3("Price must be between $1 and $100,000");
  if (input.imageIds.length < 1) throw bad3("Add at least one photo");
  if (input.subcategory && subcategoryInfo(input.subcategory)?.category !== input.category)
    throw bad3("That type doesn't belong to the chosen category");
}
function checkPhotoLimit(count, maxPhotos, alreadyHad = 0) {
  if (count > Math.max(maxPhotos, alreadyHad))
    throw new AppError({
      code: "FORBIDDEN",
      message: `Your plan allows up to ${maxPhotos} photos per listing. Upgrade to Pro for more.`
    });
}
function cleanListing(input) {
  return {
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    brand: input.brand.trim(),
    size: input.size.trim(),
    // Always sent, so changing category can clear an old sub-category
    subcategory: input.subcategory ?? void 0
  };
}
async function requireOwnListing(ctx, listingId) {
  const user = await requireUser(ctx);
  const listing = await ctx.db.get("listings", listingId);
  if (!listing)
    throw new AppError({ code: "NOT_FOUND", message: "Listing not found" });
  if (listing.sellerId !== user._id)
    throw new AppError({ code: "FORBIDDEN", message: "Not your listing" });
  return listing;
}
async function syncAuctionPrice(ctx, auction, requestedCents) {
  if (!auction) return requestedCents;
  if (auction.bidCount > 0) return auction.currentBidCents;
  await ctx.db.patch("auctions", auction._id, {
    startingBidCents: requestedCents,
    currentBidCents: requestedCents
  });
  return requestedCents;
}
var generateUploadUrl = mutation({
  args: {
    visibility: v.optional(v.union(v.literal("public"), v.literal("private")))
  },
  handler: async (ctx, { visibility }) => {
    const user = await requireUser(ctx);
    return await ctx.storage.generateUploadUrl(
      user._id,
      visibility ?? "public"
    );
  }
});
function searchTerms(search2) {
  const terms = search2.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 8);
  return terms.length ? terms.map((t) => `${t}:*`).join(" & ") : null;
}
var browse = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    category: v.optional(categoryValidator),
    condition: v.optional(conditionValidator),
    sort: v.union(
      v.literal("newest"),
      v.literal("price_asc"),
      v.literal("price_desc")
    ),
    saleType: v.optional(saleTypeValidator),
    minPriceCents: v.optional(v.number()),
    maxPriceCents: v.optional(v.number()),
    listedWithinDays: v.optional(v.number()),
    verifiedOnly: v.optional(v.boolean()),
    /** Only listings with locked photos or videos buyers can unlock right away */
    lockedOnly: v.optional(v.boolean()),
    /** Only locked listings that include this kind of media */
    lockedMedia: v.optional(mediaKindValidator),
    /** Several categories at once (a whole menu section) */
    categories: v.optional(v.array(categoryValidator, 10)),
    subcategory: v.optional(v.string()),
    /** Seller profile filters: each listed field must match one of its values. */
    seller: v.optional(
      v.array(
        v.object({ key: v.string(), values: v.array(v.string(), 50) }),
        SELLER_DETAIL_FIELDS.length
      )
    )
  },
  handler: async (ctx, args) => {
    const { category, condition, saleType } = args;
    const filters = [sql`status = 'active'`];
    if (category) filters.push(sql`category = ${category}`);
    if (condition) filters.push(sql`condition = ${condition}`);
    if (saleType) filters.push(sql`sale_type = ${saleType}`);
    if (args.lockedOnly) filters.push(sql`paywall is not null`);
    if (args.lockedMedia)
      filters.push(
        sql`exists (select 1 from jsonb_array_elements(paywall -> 'media') m where m ->> 'kind' = ${args.lockedMedia})`
      );
    if (args.categories?.length)
      filters.push(sql`category = any(${args.categories}::text[])`);
    if (args.subcategory) {
      const sub = SUBCATEGORIES.find((s) => s.value === args.subcategory);
      if (!sub)
        throw new AppError({ code: "BAD_REQUEST", message: "Unknown listing type" });
      filters.push(
        "isDefault" in sub && sub.isDefault ? sql`(subcategory = ${sub.value} or (subcategory is null and category = ${sub.category}))` : sql`subcategory = ${sub.value}`
      );
    }
    if (args.minPriceCents !== void 0)
      filters.push(sql`price_cents >= ${Math.floor(args.minPriceCents)}::int`);
    if (args.maxPriceCents !== void 0)
      filters.push(sql`price_cents < ${Math.ceil(args.maxPriceCents)}::int`);
    if (args.listedWithinDays !== void 0) {
      const days = Math.min(3650, Math.max(1, Math.floor(args.listedWithinDays)));
      filters.push(sql`created_at >= now() - make_interval(days => ${days}::int)`);
    }
    const sellerConditions = [];
    if (args.verifiedOnly) sellerConditions.push(sql`u.verified`);
    for (const { key, values } of args.seller ?? []) {
      const field = SELLER_DETAIL_FIELDS.find((f) => f.key === key);
      if (!field) throw new AppError({ code: "BAD_REQUEST", message: `Unknown filter: ${key}` });
      const allowed = values.filter(
        (x) => field.options.includes(x)
      );
      if (allowed.length === 0) continue;
      sellerConditions.push(
        sql`u.seller_details ->> ${key} = any(${allowed}::text[])`
      );
    }
    if (sellerConditions.length) {
      const match = sellerConditions.reduce((acc, f) => sql`${acc} and ${f}`);
      filters.push(
        sql`exists (select 1 from public.users u where u.id = listings.seller_id and ${match})`
      );
    }
    const where = filters.reduce(
      (acc, f, i) => i === 0 ? f : sql`${acc} and ${f}`,
      empty
    );
    const terms = args.search ? searchTerms(args.search) : null;
    const result = terms ? await ctx.db.paginateOffset(
      "listings",
      sql`select * from public.listings
               where ${where} and search @@ to_tsquery('simple', ${terms})
               order by ts_rank(search, to_tsquery('simple', ${terms})) desc, created_at desc, id desc`,
      args.paginationOpts
    ) : await browseByIndex(ctx, args.sort, where, args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(result.page.map((l) => toCard(ctx, l)))
    };
  }
});
function browseByIndex(ctx, sort, where, paginationOpts) {
  return ctx.db.paginate(
    "listings",
    {
      where,
      order: sort === "newest" ? [{ column: "created_at", cast: "timestamptz" }] : [
        { column: "price_cents", cast: "int" },
        { column: "created_at", cast: "timestamptz" }
      ],
      direction: sort === "price_asc" ? "asc" : "desc"
    },
    paginationOpts
  );
}
async function activeListingCount(ctx, sellerId) {
  ctx.db.touch("listings");
  const [row] = await ctx.db.rows(sql`
    select count(*)::int as n from public.listings
     where seller_id = ${sellerId}::uuid and status = 'active' and paywall is null`);
  return Number(row?.n ?? 0);
}
var get = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const listing = await ctx.db.get("listings", listingId);
    if (!listing) return null;
    const [seller, imageUrls, me, auction, sellerStats] = await Promise.all([
      ctx.db.get("users", listing.sellerId),
      Promise.all(listing.imageIds.map((id) => ctx.storage.getUrl(id))),
      getCurrentUserDoc(ctx),
      getAuctionByListing(ctx, listingId),
      getStats(ctx, listing.sellerId)
    ]);
    if (listing.status === "hidden" && me?._id !== listing.sellerId && me?.role !== "admin") return null;
    const { paywall, ...publicFields } = listing;
    return {
      ...publicFields,
      locked: paywall ? await lockedView(ctx, listing, paywall.media, me) : null,
      auctionHasBids: (auction?.bidCount ?? 0) > 0,
      images: listing.imageIds.flatMap((id, i) => {
        const url = imageUrls[i];
        return url ? [{ id, url }] : [];
      }),
      seller: seller ? {
        _id: seller._id,
        name: publicSellerName(seller),
        location: seller.location ?? null,
        memberSince: seller._creationTime,
        isPro: await getPlan(ctx, seller._id) === "pro",
        verified: !!seller.verified,
        avatarUrl: seller.avatarStorageId ? await ctx.storage.getUrl(seller.avatarStorageId) : null,
        activeListings: await activeListingCount(ctx, seller._id),
        ...summarize(sellerStats)
      } : null,
      isOwner: me?._id === listing.sellerId
    };
  }
});
async function lockedView(ctx, listing, media, me) {
  const [canView, unlock] = await Promise.all([
    canViewLocked(ctx, listing, me),
    me && me._id !== listing.sellerId ? getUnlock(ctx, listing._id, me._id) : null
  ]);
  const urls = canView ? await Promise.all(media.map((m) => ctx.storage.getUrl(m.storageId))) : [];
  return {
    photoCount: media.filter((m) => m.kind === "image").length,
    videoCount: media.filter((m) => m.kind === "video").length,
    // "expired" once the 24 hours are up, so the buyer can request again
    unlockStatus: unlock?.status === "granted" && !canView ? "expired" : unlock?.status ?? null,
    unlockExpiresAt: canView && unlock ? unlockExpiry(unlock) : null,
    media: canView ? media.flatMap((m, i) => {
      const url = urls[i];
      return url ? [{ storageId: m.storageId, kind: m.kind, url, durationSec: m.durationSec }] : [];
    }) : null
  };
}
var bySeller = query({
  args: {
    sellerId: v.id("users"),
    status: listingStatusValidator,
    paginationOpts: paginationOptsValidator,
    // "items" = regular listings, "instant" = paywalled Instant Content. Missing = both
    kind: v.optional(v.union(v.literal("items"), v.literal("instant")))
  },
  handler: async (ctx, { sellerId, status, paginationOpts, kind }) => {
    const paywallFilter = kind === "items" ? sql` and paywall is null` : kind === "instant" ? sql` and paywall is not null` : empty;
    const result = await ctx.db.paginate(
      "listings",
      {
        where: sql`seller_id = ${sellerId}::uuid and status = ${status}${paywallFilter}`,
        order: [{ column: "created_at", cast: "timestamptz" }],
        direction: "desc"
      },
      paginationOpts
    );
    return {
      ...result,
      page: await Promise.all(result.page.map((l) => toCard(ctx, l)))
    };
  }
});
var landingCounts = query({
  args: {},
  handler: async (ctx) => {
    ctx.db.touch("listings");
    const [row] = await ctx.db.rows(sql`
      select
        count(*) filter (where category in ('panties', 'bras', 'lingerie') and paywall is null)::int as underwear,
        count(*) filter (where category = 'shoes' and paywall is null)::int as shoes,
        count(*) filter (where category = 'socks' and paywall is null)::int as hosiery,
        count(*) filter (where category in ('clothing', 'activewear') and paywall is null)::int as clothing,
        count(*) filter (where paywall is not null)::int as instant
      from public.listings where status = 'active'`);
    const n = (k) => Number(row?.[k] ?? 0);
    return {
      underwear: n("underwear"),
      shoes: n("shoes"),
      hosiery: n("hosiery"),
      clothing: n("clothing"),
      instant: n("instant")
    };
  }
});
var shopPage = query({
  args: {
    sellerId: v.id("users"),
    page: v.number(),
    category: v.optional(categoryValidator),
    /** "instant": Instant Content (locked) listings instead of regular ones */
    kind: v.optional(v.literal("instant"))
  },
  handler: async (ctx, { sellerId, page, category, kind }) => {
    const PAGE_SIZE = 20;
    ctx.db.touch("listings");
    const where = sql`seller_id = ${sellerId}::uuid and status = 'active' and ${kind === "instant" ? sql`paywall is not null` : sql`paywall is null`}${category ? sql` and category = ${category}` : empty}`;
    const total = Number(
      await ctx.db.scalar(sql`select count(*) from public.listings where ${where}`) ?? 0
    );
    const offset = Math.max(0, Math.floor(page)) * PAGE_SIZE;
    const docs = await ctx.db.docs(
      "listings",
      sql`select * from public.listings where ${where} order by created_at desc, id desc limit ${PAGE_SIZE}::int offset ${offset}::int`
    );
    return {
      total,
      pageSize: PAGE_SIZE,
      items: await Promise.all(docs.map((l) => toCard(ctx, l)))
    };
  }
});
var create2 = mutation({
  args: {
    ...listingFields,
    saleType: saleTypeValidator,
    // Required when saleType is "auction"
    durationHours: v.optional(v.number())
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
          message: "Locked photo and video listings are a Pro feature"
        });
      if (saleType !== "fixed")
        throw new AppError({
          code: "BAD_REQUEST",
          message: "Locked listings must be fixed price"
        });
      await validateLockedMedia(ctx, user._id, locked, fields.imageIds.length);
    } else {
      checkPhotoLimit(fields.imageIds.length, limits.maxPhotos);
    }
    if (saleType === "auction" && !limits.auctions)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Auctions are a Pro feature"
      });
    if (saleType === "auction" && (durationHours === void 0 || !isAllowedDuration(durationHours)))
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Pick an auction length"
      });
    const listingId = await ctx.db.insert("listings", {
      ...cleanListing(fields),
      sellerId: user._id,
      status: "active",
      saleType,
      ...locked ? { paywall: { media: locked } } : {}
    });
    if (saleType === "auction" && durationHours !== void 0) {
      await createAuction(ctx, {
        listingId,
        sellerId: user._id,
        startingBidCents: fields.priceCents,
        durationHours
      });
    }
    await insertListingPost(ctx, { _id: listingId, sellerId: user._id }, false);
    return listingId;
  }
});
var update = mutation({
  args: { listingId: v.id("listings"), ...listingFields },
  handler: async (ctx, { listingId, locked, ...fields }) => {
    const listing = await requireOwnListing(ctx, listingId);
    validateListing(fields);
    assertOwnFiles(
      fields.imageIds,
      listing.sellerId,
      "public",
      listing.imageIds
    );
    if (!!locked !== !!listing.paywall)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "A listing can't change between locked and regular"
      });
    if (locked) {
      await validateLockedMedia(
        ctx,
        listing.sellerId,
        locked,
        fields.imageIds.length,
        (listing.paywall?.media ?? []).map((m) => m.storageId)
      );
    } else {
      const limits = PLAN_LIMITS[await getPlan(ctx, listing.sellerId)];
      checkPhotoLimit(
        fields.imageIds.length,
        limits.maxPhotos,
        listing.imageIds.length
      );
    }
    const keptLocked = new Set((locked ?? []).map((m) => m.storageId));
    const removed = [
      ...listing.imageIds.filter((id) => !fields.imageIds.includes(id)),
      ...(listing.paywall?.media ?? []).filter((m) => !keptLocked.has(m.storageId)).map((m) => m.storageId)
    ];
    const auction = await getAuctionByListing(ctx, listingId);
    const priceCents = await syncAuctionPrice(ctx, auction, fields.priceCents);
    removed.forEach((id) => ctx.storage.delete(id));
    await ctx.db.patch("listings", listingId, {
      ...cleanListing(fields),
      priceCents,
      ...locked ? { paywall: { media: locked } } : {}
    });
    return listingId;
  }
});
var setStatus = mutation({
  args: {
    listingId: v.id("listings"),
    status: v.union(v.literal("active"), v.literal("sold"))
  },
  handler: async (ctx, { listingId, status }) => {
    const listing = await requireOwnListing(ctx, listingId);
    if (listing.saleType === "auction")
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Auctions close automatically"
      });
    if (listing.status === status) return null;
    if (status === "active") {
      const order = await liveOrderForListing(ctx, listingId);
      if (order && order.status !== "awaiting_address" && order.status !== "ready_to_ship")
        throw new AppError({
          code: "CONFLICT",
          message: order.status === "label_created" ? "Void the shipping label in Orders before relisting" : "This item has already shipped"
        });
      if (order)
        await ctx.db.patch("orders", order._id, {
          status: "cancelled",
          updatedAt: new Date(ctx.now()).toISOString()
        });
    }
    await ctx.db.patch("listings", listingId, { status });
    await bumpStats(ctx, listing.sellerId, {
      salesCount: status === "sold" ? 1 : -1
    });
    return null;
  }
});
var remove2 = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const listing = await requireOwnListing(ctx, listingId);
    const auction = await getAuctionByListing(ctx, listingId);
    if (auction && auction.status === "live" && auction.bidCount > 0)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "You can't delete an auction that already has bids"
      });
    await deleteListingCascade(ctx, listing);
    return null;
  }
});

// supabase/functions/_shared/modules/customRequests.ts
var MIN_PRICE_CENTS = 100;
var MAX_PRICE_CENTS2 = 1e6;
var MAX_DETAILS = 1e3;
var MAX_NOTE = 300;
var MAX_OPEN_PER_SELLER = 3;
function partyOf(req, userId) {
  if (req.buyerId === userId) return "buyer";
  if (req.sellerId === userId) return "seller";
  return null;
}
function assertCanAct(req, party, action2) {
  if (req.status !== "pending") {
    throw new AppError({
      code: "CONFLICT",
      message: "This request is already closed"
    });
  }
  if (action2 === "cancel") {
    if (party !== "buyer")
      throw new AppError({
        code: "FORBIDDEN",
        message: "Only the buyer can cancel"
      });
    return;
  }
  if (req.offeredBy === party) {
    throw new AppError({
      code: "BAD_REQUEST",
      message: "Waiting for the other side to respond"
    });
  }
}
function assertPrice(cents) {
  if (!Number.isInteger(cents) || cents < MIN_PRICE_CENTS || cents > MAX_PRICE_CENTS2) {
    throw new AppError({
      code: "BAD_REQUEST",
      message: "Enter a price between $1 and $10,000"
    });
  }
}
var partyValidator = v.union(v.literal("buyer"), v.literal("seller"));
var create3 = mutation({
  args: {
    sellerId: v.id("users"),
    category: categoryValidator,
    wearTime: conditionValidator,
    size: v.string(),
    details: v.string(),
    budgetCents: v.number()
  },
  handler: async (ctx, args) => {
    const me = await requireCapability(ctx, "buy");
    if (me._id === args.sellerId) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "You can't send a request to yourself"
      });
    }
    const seller = await ctx.db.get("users", args.sellerId);
    if (!seller || seller.accountType !== "seller" && seller.role !== "admin") {
      throw new AppError({ code: "NOT_FOUND", message: "Seller not found" });
    }
    const size = args.size.trim();
    const details = args.details.trim();
    if (!size || size.length > 20)
      throw new AppError({ code: "BAD_REQUEST", message: "Enter a size" });
    if (details.length < 10 || details.length > MAX_DETAILS) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Describe your request in 10 to 1000 characters"
      });
    }
    assertPrice(args.budgetCents);
    const open = Number(
      await ctx.db.scalar(sql`
        select count(*)::int from public.custom_requests
         where buyer_id = ${me._id}::uuid and seller_id = ${args.sellerId}::uuid and status = 'pending'`)
    );
    if (open >= MAX_OPEN_PER_SELLER) {
      throw new AppError({
        code: "CONFLICT",
        message: `You already have ${MAX_OPEN_PER_SELLER} open requests with this seller`
      });
    }
    return await ctx.db.insert("customRequests", {
      buyerId: me._id,
      sellerId: args.sellerId,
      category: args.category,
      wearTime: args.wearTime,
      size,
      details,
      budgetCents: args.budgetCents,
      offerCents: args.budgetCents,
      offeredBy: "buyer",
      status: "pending",
      updatedAt: new Date(ctx.now()).toISOString()
    });
  }
});
var respond = mutation({
  args: {
    requestId: v.id("customRequests"),
    action: v.union(
      v.literal("accept"),
      v.literal("decline"),
      v.literal("counter"),
      v.literal("cancel")
    ),
    offerCents: v.optional(v.number()),
    note: v.optional(v.string())
  },
  handler: async (ctx, { requestId, action: action2, offerCents, note }) => {
    const me = await requireUser(ctx);
    const req = await ctx.db.get("customRequests", requestId);
    const party = req ? partyOf(req, me._id) : null;
    if (!req || !party)
      throw new AppError({ code: "NOT_FOUND", message: "Request not found" });
    assertCanAct(req, party, action2);
    const updatedAt = new Date(ctx.now()).toISOString();
    if (action2 === "counter") {
      if (offerCents === void 0)
        throw new AppError({
          code: "BAD_REQUEST",
          message: "Enter your price"
        });
      assertPrice(offerCents);
      const trimmed = note?.trim() ?? "";
      if (trimmed.length > MAX_NOTE) {
        throw new AppError({
          code: "BAD_REQUEST",
          message: "Keep your note under 300 characters"
        });
      }
      await ctx.db.patch("customRequests", requestId, {
        offerCents,
        offeredBy: party,
        note: trimmed || void 0,
        updatedAt
      });
      return null;
    }
    const status = action2 === "accept" ? "accepted" : action2 === "decline" ? "declined" : "cancelled";
    await ctx.db.patch("customRequests", requestId, { status, updatedAt });
    if (status === "accepted") {
      await createOrder(ctx, {
        sellerId: req.sellerId,
        buyerId: req.buyerId,
        customRequestId: requestId,
        title: `Custom order: ${CATEGORY_LABEL_SERVER[req.category] ?? req.category}, size ${req.size}`
      });
    }
    return null;
  }
});
var list3 = query({
  args: { role: partyValidator, paginationOpts: paginationOptsValidator },
  handler: async (ctx, { role, paginationOpts }) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db.paginate(
      "customRequests",
      {
        where: role === "buyer" ? sql`buyer_id = ${me._id}::uuid` : sql`seller_id = ${me._id}::uuid`,
        order: [{ column: "updated_at", cast: "timestamptz" }],
        direction: "desc"
      },
      paginationOpts
    );
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (r) => {
          const other = await ctx.db.get(
            "users",
            role === "buyer" ? r.sellerId : r.buyerId
          );
          return {
            _id: r._id,
            category: r.category,
            wearTime: r.wearTime,
            size: r.size,
            details: r.details,
            budgetCents: r.budgetCents,
            offerCents: r.offerCents,
            note: r.note ?? null,
            status: r.status,
            updatedAt: r.updatedAt,
            createdAt: r._creationTime,
            myTurn: r.status === "pending" && r.offeredBy !== role,
            lastOfferByMe: r.offeredBy === role,
            other: other ? {
              _id: other._id,
              name: publicSellerName(other),
              avatarUrl: other.avatarStorageId ? await ctx.storage.getUrl(other.avatarStorageId) : null
            } : null
          };
        })
      )
    };
  }
});

// supabase/functions/_shared/modules/favorites.ts
var favorites_exports = {};
__export(favorites_exports, {
  followedSellers: () => followedSellers,
  isFavorite: () => isFavorite,
  mine: () => mine3,
  toggle: () => toggle2
});
async function findFavorite(ctx, userId, listingId) {
  return await ctx.db.first(
    "favorites",
    sql`where user_id = ${userId}::uuid and listing_id = ${listingId}::uuid`
  );
}
var isFavorite = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return false;
    return !!await findFavorite(ctx, me._id, listingId);
  }
});
var toggle2 = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const me = await requireUser(ctx);
    const listing = await ctx.db.get("listings", listingId);
    if (!listing)
      throw new AppError({ code: "NOT_FOUND", message: "Listing not found" });
    if (listing.sellerId === me._id)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "You can't save your own listing"
      });
    const existing = await findFavorite(ctx, me._id, listingId);
    if (existing) {
      await ctx.db.delete("favorites", existing._id);
      return false;
    }
    await ctx.db.insert("favorites", { userId: me._id, listingId });
    return true;
  }
});
var mine3 = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const me = await requireUser(ctx);
    const result = await ctx.db.paginate(
      "favorites",
      {
        where: sql`user_id = ${me._id}::uuid`,
        order: [{ column: "created_at", cast: "timestamptz" }],
        direction: "desc"
      },
      paginationOpts
    );
    const listings = await Promise.all(
      result.page.map((f) => ctx.db.get("listings", f.listingId))
    );
    const present = listings.filter((l) => l !== null);
    return {
      ...result,
      page: await Promise.all(present.map((l) => toCard(ctx, l)))
    };
  }
});
var followedSellers = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const follows = await ctx.db.select(
      "follows",
      sql`where follower_id = ${me._id}::uuid and status = 'accepted' order by created_at limit 100`
    );
    const sellers = await Promise.all(
      follows.map((f) => ctx.db.get("users", f.sellerId))
    );
    return await Promise.all(
      sellers.filter((s) => s !== null).map(async (s) => ({
        _id: s._id,
        name: publicSellerName(s),
        verified: !!s.verified,
        avatarUrl: s.avatarStorageId ? await ctx.storage.getUrl(s.avatarStorageId) : null
      }))
    );
  }
});

// supabase/functions/_shared/modules/follows.ts
var follows_exports = {};
__export(follows_exports, {
  feed: () => feed,
  isFollowing: () => isFollowing,
  respond: () => respond2,
  toggle: () => toggle3
});
var FEED_SELLERS_MAX = 100;
var FEED_PER_SELLER = 12;
var FEED_SIZE = 48;
async function findFollow(ctx, followerId, sellerId) {
  return await ctx.db.first(
    "follows",
    sql`where follower_id = ${followerId}::uuid and seller_id = ${sellerId}::uuid`
  );
}
var isFollowing = query({
  args: { sellerId: v.id("users") },
  handler: async (ctx, { sellerId }) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return "none";
    const f = await findFollow(ctx, me._id, sellerId);
    return !f ? "none" : f.status === "pending" ? "pending" : "following";
  }
});
var toggle3 = mutation({
  args: { sellerId: v.id("users") },
  handler: async (ctx, { sellerId }) => {
    const me = await requireUser(ctx);
    if (me._id === sellerId)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "You can't follow yourself"
      });
    const target = await ctx.db.get("users", sellerId);
    if (!target) throw new AppError({ code: "NOT_FOUND", message: "Member not found" });
    const existing = await findFollow(ctx, me._id, sellerId);
    if (!existing) {
      await assertNotBlocked(ctx, me._id, sellerId);
      if (me.accountType === "seller" && me.role !== "admin") {
        if (await getPlan(ctx, me._id) !== "pro")
          throw new AppError({ code: "FORBIDDEN", message: "Upgrade to Premium to follow buyers" });
        if (target.accountType !== "buyer")
          throw new AppError({ code: "BAD_REQUEST", message: "Sellers can only follow buyers" });
      } else if (target.accountType !== "seller" && target.role !== "admin") {
        throw new AppError({ code: "BAD_REQUEST", message: "Buyers can only follow sellers" });
      }
    }
    if (existing) {
      await ctx.db.delete("follows", existing._id);
      if (existing.status === "accepted") await bumpStats(ctx, sellerId, { followerCount: -1 });
      return "none";
    }
    await ctx.db.insert("follows", { followerId: me._id, sellerId, status: "pending" });
    await queueEmail(ctx, {
      to: target,
      kind: "follow_request",
      subject: `${publicSellerName(me)} wants to follow you`,
      heading: "New follow request",
      lines: [`${publicSellerName(me)} sent you a follow request. Accept or delete it from your notifications.`],
      button: { label: "View notifications", path: "/notifications" },
      dedupeKey: throttleKey(ctx, "follow_request", target._id, me._id)
    });
    return "pending";
  }
});
var respond2 = mutation({
  args: { followerId: v.id("users"), accept: v.boolean() },
  handler: async (ctx, { followerId, accept }) => {
    const me = await requireUser(ctx);
    const req = await findFollow(ctx, followerId, me._id);
    if (!req) throw new AppError({ code: "NOT_FOUND", message: "That follow request is gone" });
    if (!accept) {
      await ctx.db.delete("follows", req._id);
      if (req.status === "accepted") await bumpStats(ctx, me._id, { followerCount: -1 });
      return null;
    }
    if (req.status === "pending") {
      await ctx.db.patch("follows", req._id, { status: "accepted" });
      await bumpStats(ctx, me._id, { followerCount: 1 });
      const follower = await ctx.db.get("users", followerId);
      if (follower)
        await queueEmail(ctx, {
          to: follower,
          kind: "follow_accepted",
          subject: `${publicSellerName(me)} accepted your follow request`,
          heading: "Follow request accepted",
          lines: [`${publicSellerName(me)} accepted your follow request.`],
          button: { label: "View profile", path: `/seller/${me._id}` },
          dedupeKey: `follow_accepted:${req._id}`
        });
    }
    return null;
  }
});
var feed = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    ctx.db.touch("follows");
    const followingCount = Number(
      await ctx.db.scalar(sql`
        select count(*)::int from (
          select 1 from public.follows where follower_id = ${me._id}::uuid and status = 'accepted' limit ${FEED_SELLERS_MAX}
        ) f`)
    );
    const newest = await ctx.db.docs(
      "listings",
      sql`
        select l.* from (
          select seller_id from public.follows
           where follower_id = ${me._id}::uuid and status = 'accepted' order by created_at limit ${FEED_SELLERS_MAX}
        ) f
        cross join lateral (
          select * from public.listings
           where seller_id = f.seller_id and status = 'active'
           order by created_at desc, id desc limit ${FEED_PER_SELLER}
        ) l
        order by l.created_at desc, l.id desc
        limit ${FEED_SIZE}`
    );
    return {
      followingCount,
      listings: await Promise.all(newest.map((l) => toCard(ctx, l)))
    };
  }
});

// supabase/functions/_shared/modules/messages.ts
var messages_exports = {};
__export(messages_exports, {
  getConversation: () => getConversation,
  inbox: () => inbox,
  listMessages: () => listMessages,
  markRead: () => markRead,
  send: () => send,
  start: () => start,
  startWithSeller: () => startWithSeller,
  unreadCount: () => unreadCount
});
var MAX_BODY = 2e3;
var INBOX_LIMIT = 50;
function cleanBody2(body) {
  const trimmed = body.trim();
  if (!trimmed)
    throw new AppError({ code: "BAD_REQUEST", message: "Message is empty" });
  if (trimmed.length > MAX_BODY)
    throw new AppError({ code: "BAD_REQUEST", message: "Message is too long" });
  return trimmed;
}
async function requireParticipant(ctx, conversationId) {
  const user = await requireUser(ctx);
  const convo = await ctx.db.get("conversations", conversationId);
  if (!convo)
    throw new AppError({
      code: "NOT_FOUND",
      message: "Conversation not found"
    });
  if (convo.buyerId !== user._id && convo.sellerId !== user._id)
    throw new AppError({ code: "FORBIDDEN", message: "Not your conversation" });
  return { user, convo, isBuyer: convo.buyerId === user._id };
}
async function appendMessage(ctx, convo, senderId, body) {
  await assertNotBlocked(ctx, convo.buyerId, convo.sellerId);
  await ctx.db.insert("messages", {
    conversationId: convo._id,
    senderId,
    body
  });
  const senderIsBuyer = senderId === convo.buyerId;
  await ctx.db.patch("conversations", convo._id, {
    lastMessageAt: new Date(ctx.now()).toISOString(),
    lastMessagePreview: body.slice(0, 120),
    lastSenderId: senderId,
    buyerUnread: !senderIsBuyer,
    sellerUnread: senderIsBuyer
  });
  const [sender, recipient] = await Promise.all([
    ctx.db.get("users", senderId),
    ctx.db.get("users", senderIsBuyer ? convo.sellerId : convo.buyerId)
  ]);
  if (sender && recipient)
    await queueEmail(ctx, {
      to: recipient,
      kind: "message",
      subject: `New message from ${publicSellerName(sender)}`,
      heading: "You have a new message",
      lines: [`${publicSellerName(sender)} sent you a message on Taboo Desires.`],
      button: { label: "Open messages", path: "/messages" },
      dedupeKey: throttleKey(ctx, "message", recipient._id, convo._id)
    });
}
async function summarize2(ctx, convo, me) {
  const isBuyer = convo.buyerId === me;
  const [listing, other] = await Promise.all([
    convo.listingId ? ctx.db.get("listings", convo.listingId) : null,
    ctx.db.get("users", isBuyer ? convo.sellerId : convo.buyerId)
  ]);
  const [imageUrl, avatarUrl] = await Promise.all([
    listing?.imageIds[0] ? ctx.storage.getUrl(listing.imageIds[0]) : null,
    other?.avatarStorageId ? ctx.storage.getUrl(other.avatarStorageId) : null
  ]);
  return {
    _id: convo._id,
    role: isBuyer ? "buyer" : "seller",
    lastMessageAt: convo.lastMessageAt,
    lastMessagePreview: convo.lastMessagePreview,
    lastFromMe: convo.lastSenderId === me,
    unread: isBuyer ? convo.buyerUnread : convo.sellerUnread,
    other: {
      _id: other?._id ?? null,
      name: other ? publicSellerName(other) : "Deleted user",
      avatarUrl
    },
    listing: listing ? {
      _id: listing._id,
      title: listing.title,
      priceCents: listing.priceCents,
      status: listing.status,
      imageUrl
    } : null
  };
}
async function assertSellerAcceptsBuyer(ctx, sellerId, buyerId) {
  const seller = await ctx.db.get("users", sellerId);
  if (acceptsNewMessages(seller?.settings)) return;
  const talking = await ctx.db.first(
    "conversations",
    sql`where seller_id = ${sellerId}::uuid and buyer_id = ${buyerId}::uuid`
  );
  if (!talking)
    throw new AppError({
      code: "FORBIDDEN",
      message: "This seller isn't accepting new messages right now"
    });
}
var start = mutation({
  args: { listingId: v.id("listings"), body: v.string() },
  handler: async (ctx, { listingId, body }) => {
    await requireCapability(ctx, "message");
    const user = await requireCapability(ctx, "buy");
    const text = cleanBody2(body);
    const listing = await ctx.db.get("listings", listingId);
    if (!listing)
      throw new AppError({ code: "NOT_FOUND", message: "Listing not found" });
    if (listing.sellerId === user._id)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "This is your own listing"
      });
    const existing = await ctx.db.first(
      "conversations",
      sql`where listing_id = ${listingId}::uuid and buyer_id = ${user._id}::uuid`
    );
    if (!existing) await assertSellerAcceptsBuyer(ctx, listing.sellerId, user._id);
    const convo = existing ?? await ctx.db.get(
      "conversations",
      await ctx.db.insert("conversations", {
        listingId,
        buyerId: user._id,
        sellerId: listing.sellerId,
        lastMessageAt: new Date(ctx.now()).toISOString(),
        lastMessagePreview: "",
        lastSenderId: user._id,
        buyerUnread: false,
        sellerUnread: true
      })
    );
    if (!convo)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Conversation missing"
      });
    await appendMessage(ctx, convo, user._id, text);
    return convo._id;
  }
});
var startWithSeller = mutation({
  args: { sellerId: v.id("users"), body: v.string() },
  handler: async (ctx, { sellerId, body }) => {
    await requireCapability(ctx, "message");
    const user = await requireCapability(ctx, "buy");
    const text = cleanBody2(body);
    if (sellerId === user._id)
      throw new AppError({ code: "BAD_REQUEST", message: "This is your own profile" });
    const seller = await ctx.db.get("users", sellerId);
    if (!seller || seller.accountType !== "seller")
      throw new AppError({ code: "NOT_FOUND", message: "Seller not found" });
    const existing = await ctx.db.first(
      "conversations",
      sql`where listing_id is null and buyer_id = ${user._id}::uuid and seller_id = ${sellerId}::uuid`
    );
    if (!existing) await assertSellerAcceptsBuyer(ctx, sellerId, user._id);
    const convo = existing ?? await ctx.db.get(
      "conversations",
      await ctx.db.insert("conversations", {
        buyerId: user._id,
        sellerId,
        lastMessageAt: new Date(ctx.now()).toISOString(),
        lastMessagePreview: "",
        lastSenderId: user._id,
        buyerUnread: false,
        sellerUnread: true
      })
    );
    if (!convo)
      throw new AppError({ code: "NOT_FOUND", message: "Conversation missing" });
    await appendMessage(ctx, convo, user._id, text);
    return convo._id;
  }
});
var send = mutation({
  args: { conversationId: v.id("conversations"), body: v.string() },
  handler: async (ctx, { conversationId, body }) => {
    await requireCapability(ctx, "message");
    const { user, convo } = await requireParticipant(ctx, conversationId);
    await appendMessage(ctx, convo, user._id, cleanBody2(body));
    return null;
  }
});
var markRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const { convo, isBuyer } = await requireParticipant(ctx, conversationId);
    if (isBuyer && convo.buyerUnread)
      await ctx.db.patch("conversations", conversationId, {
        buyerUnread: false
      });
    if (!isBuyer && convo.sellerUnread)
      await ctx.db.patch("conversations", conversationId, {
        sellerUnread: false
      });
    return null;
  }
});
var inbox = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return [];
    const convos = await ctx.db.select(
      "conversations",
      sql`where buyer_id = ${me._id}::uuid or seller_id = ${me._id}::uuid
          order by last_message_at desc, id desc limit ${INBOX_LIMIT}`
    );
    return await Promise.all(convos.map((c2) => summarize2(ctx, c2, me._id)));
  }
});
var unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return 0;
    ctx.db.touch("conversations");
    const n = await ctx.db.scalar(sql`
      select (
        (select count(*) from (select 1 from public.conversations
          where buyer_id = ${me._id}::uuid and buyer_unread limit 10) b)
        + (select count(*) from (select 1 from public.conversations
          where seller_id = ${me._id}::uuid and seller_unread limit 10) s)
      )::int`);
    return Number(n);
  }
});
var getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const { user, convo } = await requireParticipant(ctx, conversationId);
    const summary = await summarize2(ctx, convo, user._id);
    const presence = summary.other._id ? await ctx.db.first("presence", sql`where user_id = ${summary.other._id}::uuid`) : null;
    return { ...summary, meId: user._id, otherLastSeenAt: presence?.lastSeenAt ?? null };
  }
});
var listMessages = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator
  },
  handler: async (ctx, { conversationId, paginationOpts }) => {
    await requireParticipant(ctx, conversationId);
    return await ctx.db.paginate(
      "messages",
      {
        where: sql`conversation_id = ${conversationId}::uuid`,
        order: [{ column: "created_at", cast: "timestamptz" }],
        direction: "desc"
      },
      paginationOpts
    );
  }
});

// supabase/functions/_shared/modules/notifications.ts
var notifications_exports = {};
__export(notifications_exports, {
  list: () => list4,
  markSeen: () => markSeen,
  unreadCount: () => unreadCount2
});
var WINDOW_DAYS = 30;
var LIMIT = 50;
async function recentFor(ctx, userId) {
  ctx.db.touch(
    "follows",
    "bids",
    "auctions",
    "customRequests",
    "unlocks",
    "reviews",
    "postLikes",
    "postComments",
    "postCommentLikes",
    "users"
  );
  const me = sql`${userId}::uuid`;
  const since = sql`now() - make_interval(days => ${WINDOW_DAYS}::int)`;
  const rows = await ctx.db.rows(sql`
    select * from (
      select 'follow' as kind, f.created_at as at, a.id as actor_id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'Someone') as actor,
             f.status as title, null::uuid as target_id, null::int as amount
        from public.follows f join public.users a on a.id = f.follower_id
       where f.seller_id = ${me} and f.created_at > ${since}
      union all
      select 'bid', b.created_at, a.id, coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'A bidder'),
             l.title, l.id, b.amount_cents
        from public.bids b
        join public.auctions au on au.id = b.auction_id
        join public.listings l on l.id = au.listing_id
        left join public.users a on a.id = b.bidder_id
       where au.seller_id = ${me} and b.bidder_id is distinct from ${me} and b.created_at > ${since}
      union all
      select 'auction_won', au.ends_at, null, null, l.title, l.id, au.current_bid_cents
        from public.auctions au join public.listings l on l.id = au.listing_id
       where au.high_bidder_id = ${me} and au.status = 'ended' and au.ends_at > ${since}
      union all
      select 'custom_request', c.created_at, a.id,
             coalesce(nullif(a.name, ''), 'Anonymous buyer'), null, c.id, c.offer_cents
        from public.custom_requests c join public.users a on a.id = c.buyer_id
       where c.seller_id = ${me} and c.created_at > ${since}
      union all
      select 'custom_answered', c.updated_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'The seller'), c.status, c.id, c.offer_cents
        from public.custom_requests c join public.users a on a.id = c.seller_id
       where c.buyer_id = ${me} and c.status in ('accepted', 'declined') and c.updated_at > ${since}
      union all
      select 'unlock_request', u.requested_at, a.id,
             coalesce(nullif(a.name, ''), 'Anonymous buyer'), l.title, l.id, null
        from public.unlocks u
        join public.users a on a.id = u.buyer_id
        join public.listings l on l.id = u.listing_id
       where u.seller_id = ${me} and u.status = 'pending' and u.requested_at > ${since}
      union all
      select 'unlock_granted', u.requested_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'The seller'), l.title, l.id, null
        from public.unlocks u
        join public.users a on a.id = u.seller_id
        join public.listings l on l.id = u.listing_id
       where u.buyer_id = ${me} and u.status = 'granted' and u.requested_at > ${since}
      union all
      select 'review', r.updated_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'A buyer'), null, null, r.rating
        from public.reviews r join public.users a on a.id = r.reviewer_id
       where r.seller_id = ${me} and r.updated_at > ${since}
      union all
      select 'post_like', pl.created_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'Someone'), null, p.id, null
        from public.post_likes pl
        join public.posts p on p.id = pl.post_id
        join public.users a on a.id = pl.user_id
       where p.author_id = ${me} and pl.user_id <> ${me} and pl.created_at > ${since}
      union all
      select 'post_comment', pc.created_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'Someone'), null, p.id, null
        from public.post_comments pc
        join public.posts p on p.id = pc.post_id
        join public.users a on a.id = pc.author_id
       where p.author_id = ${me} and pc.author_id <> ${me} and pc.created_at > ${since}
      union all
      -- someone liked a comment of mine; title carries the post author's id so the link can open that profile
      select 'comment_like', cl.created_at, a.id,
             coalesce(nullif(a.shop_name, ''), nullif(a.name, ''), 'Someone'), p.author_id::text, p.id, null
        from public.post_comment_likes cl
        join public.post_comments pc on pc.id = cl.comment_id
        join public.posts p on p.id = pc.post_id
        join public.users a on a.id = cl.user_id
       where pc.author_id = ${me} and cl.user_id <> ${me} and cl.created_at > ${since}
    ) n
    order by at desc
    limit ${LIMIT}::int`);
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((id) => !!id))];
  const avatars = /* @__PURE__ */ new Map();
  await Promise.all(
    actorIds.map(async (id) => {
      const u = await ctx.db.get("users", id);
      avatars.set(id, u?.avatarStorageId ? await ctx.storage.getUrl(u.avatarStorageId) : null);
    })
  );
  return rows.map((r) => ({
    actorAvatarUrl: (r.actor_id ? avatars.get(r.actor_id) : null) ?? null,
    kind: r.kind,
    at: new Date(r.at).getTime(),
    actorId: r.actor_id ?? null,
    actor: r.actor ?? null,
    title: r.title ?? null,
    targetId: r.target_id ?? null,
    amountCents: r.amount == null ? null : Number(r.amount)
  }));
}
async function seenAt(ctx, userId) {
  const [row] = await ctx.db.rows(
    sql`select notifications_seen_at from public.users where id = ${userId}::uuid`
  );
  const value = row?.notifications_seen_at;
  return value ? new Date(value).getTime() : 0;
}
var list4 = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    const [items, seen] = await Promise.all([
      recentFor(ctx, me._id),
      seenAt(ctx, me._id)
    ]);
    return items.map((n) => ({ ...n, unread: n.at > seen }));
  }
});
var unreadCount2 = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return 0;
    const [items, seen] = await Promise.all([
      recentFor(ctx, me._id),
      seenAt(ctx, me._id)
    ]);
    return items.filter((n) => n.at > seen).length;
  }
});
var markSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    await ctx.db.rows(
      sql`update public.users set notifications_seen_at = now() where id = ${me._id}::uuid`
    );
    return null;
  }
});

// supabase/functions/_shared/modules/posts.ts
var posts_exports = {};
__export(posts_exports, {
  addComment: () => addComment2,
  create: () => create4,
  feed: () => feed2,
  likers: () => likers,
  listComments: () => listComments,
  onlineAuthors: () => onlineAuthors,
  remove: () => remove3,
  removeComment: () => removeComment2,
  repostListing: () => repostListing,
  toggleCommentLike: () => toggleCommentLike,
  toggleLike: () => toggleLike2
});
var ONLINE_WINDOW_MS = 5 * 60 * 1e3;
var filterValidator = v.union(
  v.literal("all"),
  v.literal("photo"),
  v.literal("listing"),
  v.literal("status")
);
var sortValidator = v.union(v.literal("newest"), v.literal("popular"));
var feed2 = query({
  args: {
    filter: filterValidator,
    sort: sortValidator,
    paginationOpts: paginationOptsValidator,
    /** Only this member's posts (their profile's Latest activity) */
    authorId: v.optional(v.id("users"))
  },
  handler: async (ctx, { filter, sort, paginationOpts, authorId }) => {
    const me = await getCurrentUserDoc(ctx);
    const order = sort === "popular" ? [
      { column: "like_count", cast: "int" },
      { column: "created_at", cast: "timestamptz" }
    ] : [{ column: "created_at", cast: "timestamptz" }];
    const result = await ctx.db.paginate(
      "posts",
      {
        where: [
          filter === "all" ? null : sql`kind = ${filter}`,
          authorId ? sql`author_id = ${authorId}::uuid` : null,
          me?.role === "admin" ? null : sql`not hidden`
        ].filter((w) => w !== null).reduce((acc, w) => acc ? sql`${acc} and ${w}` : w, void 0),
        order,
        direction: "desc"
      },
      paginationOpts
    );
    return {
      ...result,
      page: await Promise.all(result.page.map((p) => toFeedItem(ctx, p, me)))
    };
  }
});
var onlineAuthors = query({
  args: { userIds: v.array(v.id("users"), 500) },
  handler: async (ctx, { userIds }) => {
    const unique = [...new Set(userIds)].slice(0, 100);
    if (unique.length === 0) return [];
    const since = new Date(ctx.now() - ONLINE_WINDOW_MS).toISOString();
    const rows = await ctx.db.select(
      "presence",
      sql`where user_id = any(${unique}::uuid[]) and last_seen_at > ${since}::timestamptz`
    );
    return rows.map((r) => r.userId);
  }
});
var create4 = mutation({
  args: { body: v.string(), imageIds: v.array(v.storageId(), 20) },
  handler: async (ctx, { body, imageIds }) => {
    const me = await requireCapability(ctx, "post");
    if (imageIds.length > POST_IMAGES_MAX) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: `Add up to ${POST_IMAGES_MAX} photos`
      });
    }
    assertOwnFiles(imageIds, me._id, "public");
    const text = cleanBody(body, POST_BODY_MAX, "Post", imageIds.length === 0);
    return await ctx.db.insert("posts", {
      authorId: me._id,
      kind: imageIds.length > 0 ? "photo" : "status",
      repost: false,
      body: text,
      imageIds,
      likeCount: 0,
      commentCount: 0
    });
  }
});
var repostListing = mutation({
  args: { listingId: v.id("listings"), body: v.string() },
  handler: async (ctx, { listingId, body }) => {
    const me = await requireCapability(ctx, "post");
    const listing = await ctx.db.get("listings", listingId);
    if (!listing)
      throw new AppError({ code: "NOT_FOUND", message: "Listing not found" });
    if (listing.sellerId !== me._id)
      throw new AppError({ code: "FORBIDDEN", message: "Not your listing" });
    if (listing.status !== "active") {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Only active listings can be reposted"
      });
    }
    return await insertListingPost(
      ctx,
      listing,
      true,
      cleanBody(body, POST_BODY_MAX, "Post", false)
    );
  }
});
var remove3 = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const me = await requireUser(ctx);
    const post = await ctx.db.get("posts", postId);
    if (!post) return null;
    if (post.authorId !== me._id && me.role !== "admin") {
      throw new AppError({ code: "FORBIDDEN", message: "Not your post" });
    }
    await deletePostCascade(ctx, post);
    return null;
  }
});
var toggleLike2 = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const me = await requireUser(ctx);
    const post = await ctx.db.get("posts", postId);
    if (!post)
      throw new AppError({ code: "NOT_FOUND", message: "Post not found" });
    const existing = await ctx.db.first(
      "postLikes",
      sql`where post_id = ${postId}::uuid and user_id = ${me._id}::uuid`
    );
    if (existing) {
      await ctx.db.delete("postLikes", existing._id);
      await ctx.db.patch("posts", postId, {
        likeCount: Math.max(0, post.likeCount - 1)
      });
      return false;
    }
    await ctx.db.insert("postLikes", { postId, userId: me._id });
    await ctx.db.patch("posts", postId, { likeCount: post.likeCount + 1 });
    return true;
  }
});
var listComments = query({
  args: {
    postId: v.id("posts"),
    parentId: v.optional(v.id("postComments")),
    paginationOpts: paginationOptsValidator
  },
  handler: async (ctx, { postId, parentId, paginationOpts }) => {
    const me = await getCurrentUserDoc(ctx);
    const result = await ctx.db.paginate(
      "postComments",
      {
        where: sql`${parentId ? sql`post_id = ${postId}::uuid and parent_id = ${parentId}::uuid` : sql`post_id = ${postId}::uuid and parent_id is null`}${me?.role === "admin" ? empty : sql` and not hidden`}`,
        order: [{ column: "created_at", cast: "timestamptz" }],
        // Newest comments first; replies read top to bottom in order
        direction: parentId ? "asc" : "desc"
      },
      paginationOpts
    );
    const ids = result.page.map((c2) => c2._id);
    const liked = /* @__PURE__ */ new Set();
    if (me && ids.length) {
      ctx.db.touch("postCommentLikes");
      const rows = await ctx.db.rows(sql`
        select comment_id from public.post_comment_likes
         where user_id = ${me._id}::uuid and comment_id = any(${ids}::uuid[])`);
      for (const r of rows) liked.add(String(r.comment_id));
    }
    const likers2 = await loadCommentLikers(
      ctx,
      result.page.filter((c2) => (c2.likeCount ?? 0) > 0).map((c2) => c2._id),
      COMMENT_LIKERS_SHOWN
    );
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (c2) => ({
          _id: c2._id,
          _creationTime: c2._creationTime,
          body: c2.body,
          likeCount: c2.likeCount ?? 0,
          replyCount: c2.replyCount ?? 0,
          likedByMe: liked.has(c2._id),
          likers: likers2.get(c2._id) ?? [],
          author: await loadFeedAuthor(ctx, c2.authorId),
          canDelete: !!me && (me._id === c2.authorId || me.role === "admin")
        }))
      )
    };
  }
});
var likers = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get("posts", postId);
    if (!post) return [];
    return loadPostLikers(ctx, postId, 100);
  }
});
var addComment2 = mutation({
  args: {
    postId: v.id("posts"),
    body: v.string(),
    parentId: v.optional(v.id("postComments"))
  },
  handler: async (ctx, { postId, body, parentId }) => {
    const me = await requireCapability(ctx, "post");
    const post = await ctx.db.get("posts", postId);
    if (!post || post.hidden && me.role !== "admin")
      throw new AppError({ code: "NOT_FOUND", message: "Post not found" });
    let parent = null;
    if (parentId) {
      parent = await ctx.db.get("postComments", parentId);
      if (!parent || parent.postId !== postId)
        throw new AppError({ code: "NOT_FOUND", message: "Comment not found" });
      if (parent.parentId) parent = await ctx.db.get("postComments", parent.parentId);
      if (!parent)
        throw new AppError({ code: "NOT_FOUND", message: "Comment not found" });
    }
    const text = cleanBody(body, COMMENT_MAX, "Comment", true);
    const id = await ctx.db.insert("postComments", {
      postId,
      authorId: me._id,
      body: text,
      parentId: parent?._id,
      likeCount: 0,
      replyCount: 0
    });
    if (parent)
      await ctx.db.patch("postComments", parent._id, {
        replyCount: (parent.replyCount ?? 0) + 1
      });
    await ctx.db.patch("posts", postId, {
      commentCount: post.commentCount + 1
    });
    return id;
  }
});
var removeComment2 = mutation({
  args: { commentId: v.id("postComments") },
  handler: async (ctx, { commentId }) => {
    const me = await requireUser(ctx);
    const comment = await ctx.db.get("postComments", commentId);
    if (!comment) return null;
    if (comment.authorId !== me._id && me.role !== "admin") {
      throw new AppError({ code: "FORBIDDEN", message: "Not your comment" });
    }
    const removed = 1 + (comment.parentId ? 0 : comment.replyCount ?? 0);
    await ctx.db.delete("postComments", commentId);
    if (comment.parentId) {
      const parent = await ctx.db.get("postComments", comment.parentId);
      if (parent)
        await ctx.db.patch("postComments", parent._id, {
          replyCount: Math.max(0, (parent.replyCount ?? 0) - 1)
        });
    }
    const post = await ctx.db.get("posts", comment.postId);
    if (post)
      await ctx.db.patch("posts", post._id, {
        commentCount: Math.max(0, post.commentCount - removed)
      });
    return null;
  }
});
var toggleCommentLike = mutation({
  args: { commentId: v.id("postComments") },
  handler: async (ctx, { commentId }) => {
    const me = await requireUser(ctx);
    const comment = await ctx.db.get("postComments", commentId);
    if (!comment)
      throw new AppError({ code: "NOT_FOUND", message: "Comment not found" });
    const existing = await ctx.db.first(
      "postCommentLikes",
      sql`where comment_id = ${commentId}::uuid and user_id = ${me._id}::uuid`
    );
    if (existing) {
      await ctx.db.delete("postCommentLikes", existing._id);
      await ctx.db.patch("postComments", commentId, {
        likeCount: Math.max(0, (comment.likeCount ?? 0) - 1)
      });
      return false;
    }
    await ctx.db.insert("postCommentLikes", { commentId, userId: me._id });
    await ctx.db.patch("postComments", commentId, {
      likeCount: (comment.likeCount ?? 0) + 1
    });
    return true;
  }
});

// supabase/functions/_shared/modules/reports.ts
var reports_exports = {};
__export(reports_exports, {
  adminCounts: () => adminCounts,
  adminOpen: () => adminOpen,
  resolve: () => resolve,
  submit: () => submit2
});
var HOUR = 36e5;
var URGENT_HOURS = 48;
var NORMAL_HOURS = 24 * 7;
var URGENT_TYPES = ["nonconsensual_intimate", "underage"];
var HOURLY_LIMIT = 5;
var REPORT_TYPE_LABEL = {
  nonconsensual_intimate: "Intimate image shared without consent",
  underage: "Person under 18",
  copyright: "Copyright",
  illegal: "Illegal content",
  harassment: "Harassment",
  other: "Other"
};
var typeValidator = v.union(
  v.literal("nonconsensual_intimate"),
  v.literal("underage"),
  v.literal("copyright"),
  v.literal("illegal"),
  v.literal("harassment"),
  v.literal("other")
);
var targetValidator = v.union(
  v.literal("listing"),
  v.literal("post"),
  v.literal("comment"),
  v.literal("profile"),
  v.literal("other")
);
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var bad2 = (message) => new AppError({ code: "BAD_REQUEST", message });
var AUTO_HIDE_AT = 2;
async function openReporters(ctx, kind, id) {
  const rows = await ctx.db.rows(sql`
    select count(distinct reporter_email)::int as n from public.content_reports
     where status = 'open' and target_kind = ${kind} and target_id = ${id}`);
  return Number(rows[0]?.n ?? 0);
}
async function hideTarget(ctx, kind, id) {
  if (kind === "listing") {
    const l = await ctx.db.get("listings", id);
    if (!l || l.status === "hidden") return null;
    await ctx.db.patch("listings", l._id, { status: "hidden", hiddenPrevStatus: l.status });
    return { ownerId: l.sellerId, what: `your listing "${l.title}"` };
  }
  if (kind === "post") {
    const p = await ctx.db.get("posts", id);
    if (!p || p.hidden) return null;
    await ctx.db.patch("posts", p._id, { hidden: true });
    return { ownerId: p.authorId, what: "one of your posts" };
  }
  if (kind === "comment") {
    const c2 = await ctx.db.get("postComments", id);
    if (!c2 || c2.hidden) return null;
    await ctx.db.patch("postComments", c2._id, { hidden: true });
    return { ownerId: c2.authorId, what: "one of your comments" };
  }
  return null;
}
async function unhideTarget(ctx, kind, id) {
  if (kind === "listing") {
    const l = await ctx.db.get("listings", id);
    if (!l || l.status !== "hidden") return;
    let status = l.hiddenPrevStatus ?? "active";
    const auction = await getAuctionByListing(ctx, l._id);
    if (auction?.status === "ended") status = (auction.bidCount ?? 0) > 0 ? "sold" : "ended";
    await ctx.db.patch("listings", l._id, { status, hiddenPrevStatus: void 0 });
  } else if (kind === "post") {
    const p = await ctx.db.get("posts", id);
    if (p?.hidden) await ctx.db.patch("posts", p._id, { hidden: false });
  } else if (kind === "comment") {
    const c2 = await ctx.db.get("postComments", id);
    if (c2?.hidden) await ctx.db.patch("postComments", c2._id, { hidden: false });
  }
}
var submit2 = mutation({
  args: {
    reportType: typeValidator,
    targetKind: targetValidator,
    targetId: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    description: v.string(),
    reporterName: v.string(),
    reporterEmail: v.string(),
    isDepicted: v.boolean(),
    signature: v.string()
  },
  handler: async (ctx, args) => {
    const me = await getCurrentUserDoc(ctx);
    const description = args.description.trim();
    const reporterName = args.reporterName.trim();
    const reporterEmail = args.reporterEmail.trim().toLowerCase();
    const signature = args.signature.trim();
    const targetId = args.targetId?.trim() || void 0;
    const targetUrl = args.targetUrl?.trim() || void 0;
    if (description.length < 10) throw bad2("Please describe the problem (at least 10 characters)");
    if (description.length > 2e3) throw bad2("The description is too long");
    if (!reporterName || reporterName.length > 100) throw bad2("Enter your name");
    if (!EMAIL.test(reporterEmail) || reporterEmail.length > 200) throw bad2("Enter a valid email address");
    if (!signature || signature.length > 100) throw bad2("Type your full name as your signature");
    if (targetId && !UUID.test(targetId)) throw bad2("That link isn't valid");
    if (targetUrl && (targetUrl.length > 500 || !/^https?:\/\//i.test(targetUrl)))
      throw bad2("Enter the full link (starting with https://)");
    if (!targetId && !targetUrl) throw bad2("Tell us where the content is: add its link");
    const recent = await ctx.db.rows(sql`
      select count(*)::int as n from public.content_reports
       where reporter_email = ${reporterEmail}
         and created_at > ${new Date(ctx.now() - HOUR).toISOString()}::timestamptz`);
    if (Number(recent[0]?.n ?? 0) >= HOURLY_LIMIT)
      throw bad2("Too many reports from this email. Please try again later.");
    const hours = URGENT_TYPES.includes(args.reportType) ? URGENT_HOURS : NORMAL_HOURS;
    const dueAt = new Date(ctx.now() + hours * HOUR).toISOString();
    const reportId = await ctx.db.insert("contentReports", {
      reportType: args.reportType,
      targetKind: args.targetKind,
      targetId,
      targetUrl,
      description,
      reporterName,
      reporterEmail,
      reporterUserId: me?._id,
      isDepicted: args.isDepicted,
      signature,
      status: "open",
      dueAt
    });
    let hiddenNow = false;
    if (targetId && (args.targetKind === "listing" || args.targetKind === "post" || args.targetKind === "comment")) {
      const reporters = await openReporters(ctx, args.targetKind, targetId);
      if (reporters >= AUTO_HIDE_AT) {
        const owner = await hideTarget(ctx, args.targetKind, targetId);
        if (owner) {
          hiddenNow = true;
          const ownerDoc = await ctx.db.get("users", owner.ownerId);
          if (ownerDoc)
            await queueEmail(ctx, {
              to: ownerDoc,
              kind: "content_hidden",
              transactional: true,
              subject: "Your content is hidden while we review it",
              heading: "Hidden while we review",
              lines: [
                `We hid ${owner.what} because it was reported more than once. Our team will review it. If it follows our rules, it will be put back. If not, it will be removed.`
              ],
              dedupeKey: `content_hidden:${args.targetKind}:${targetId}:${reportId}`
            });
        }
      }
    }
    const urgent = URGENT_TYPES.includes(args.reportType);
    const location = targetUrl ?? (targetId ? `${args.targetKind} ${targetId}` : "");
    await queueEmailToAddress(ctx, {
      toEmail: reportInbox(),
      replyTo: reporterEmail,
      kind: "content_report",
      subject: `${urgent ? "URGENT: " : ""}Content report: ${REPORT_TYPE_LABEL[args.reportType]}`,
      heading: urgent ? "Urgent content report" : "New content report",
      lines: [
        `Type: ${REPORT_TYPE_LABEL[args.reportType]}`,
        `What it is: ${args.targetKind}`,
        `Where: ${location}`,
        `Reported by: ${reporterName} <${reporterEmail}>${me ? " (signed in member)" : " (not signed in)"}`,
        `Person shown in the content: ${args.isDepicted ? "Yes, the reporter is shown in it" : "No"}`,
        `Signed: ${signature}`,
        ...hiddenNow ? ["Auto-hidden: this content has 2 or more reports, so it is now hidden until you decide."] : [],
        `Respond by: ${new Date(dueAt).toUTCString()}`,
        "Details:",
        description
      ],
      button: { label: "Open the report queue", path: "/admin" },
      footer: `Sent to the content-report inbox. Reply to this email to answer ${reporterName}. Queue: ${siteUrl()}/admin`,
      dedupeKey: `content_report:${reportId}`
    });
    return null;
  }
});
async function describeTarget(ctx, kind, id) {
  if (!id) return null;
  if (kind === "listing") {
    const l = await ctx.db.get("listings", id);
    if (!l) return { exists: false, label: "Listing (already removed)", path: null };
    return { exists: true, label: `Listing: ${l.title}`, path: `/listing/${l._id}` };
  }
  if (kind === "post") {
    const p = await ctx.db.get("posts", id);
    if (!p) return { exists: false, label: "Post (already removed)", path: null };
    const a = await ctx.db.get("users", p.authorId);
    return {
      exists: true,
      label: `Post by ${a ? publicSellerName(a) : "a deleted user"}: ${p.body.slice(0, 80)}`,
      path: `/seller/${p.authorId}?post=${p._id}`
    };
  }
  if (kind === "comment") {
    const c2 = await ctx.db.get("postComments", id);
    if (!c2) return { exists: false, label: "Comment (already removed)", path: null };
    const p = await ctx.db.get("posts", c2.postId);
    return {
      exists: true,
      label: `Comment: ${c2.body.slice(0, 80)}`,
      path: p ? `/seller/${p.authorId}?post=${p._id}&comments=1` : null
    };
  }
  if (kind === "profile") {
    const u = await ctx.db.get("users", id);
    if (!u) return { exists: false, label: "Profile (deleted)", path: null };
    return { exists: true, label: `Profile: ${publicSellerName(u)}`, path: `/seller/${u._id}` };
  }
  return null;
}
var adminOpen = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db.paginate(
      "contentReports",
      { where: sql`status = 'open'`, order: [{ column: "due_at", cast: "timestamptz" }], direction: "asc" },
      paginationOpts
    );
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (r) => ({
          _id: r._id,
          reportType: r.reportType,
          targetKind: r.targetKind,
          targetUrl: r.targetUrl ?? null,
          description: r.description,
          reporterName: r.reporterName,
          reporterEmail: r.reporterEmail,
          isDepicted: r.isDepicted,
          signature: r.signature,
          createdAt: r._creationTime,
          dueAt: new Date(r.dueAt).getTime(),
          target: await describeTarget(ctx, r.targetKind, r.targetId)
        }))
      )
    };
  }
});
var adminCounts = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (me?.role !== "admin") return null;
    ctx.db.touch("contentReports");
    const rows = await ctx.db.rows(sql`
      select count(*)::int as open,
             count(*) filter (where due_at < ${new Date(ctx.now()).toISOString()}::timestamptz)::int as overdue
        from public.content_reports where status = 'open'`);
    const r = rows[0];
    return { open: Number(r?.open ?? 0), overdue: Number(r?.overdue ?? 0) };
  }
});
var resolve = mutation({
  args: {
    reportId: v.id("contentReports"),
    remove: v.boolean(),
    note: v.optional(v.string())
  },
  handler: async (ctx, { reportId, remove: remove5, note }) => {
    const admin2 = await requireAdmin(ctx);
    const report = await ctx.db.get("contentReports", reportId);
    if (!report || report.status !== "open") throw bad2("This report is already closed");
    const text = note?.trim();
    if (text && text.length > 500) throw bad2("The note is too long");
    if (remove5 && report.targetId) {
      if (report.targetKind === "listing") {
        const listing = await ctx.db.get("listings", report.targetId);
        if (listing) await deleteListingCascade(ctx, listing);
      } else if (report.targetKind === "post") {
        const post = await ctx.db.get("posts", report.targetId);
        if (post) await deletePostCascade(ctx, post);
      } else if (report.targetKind === "comment") {
        await ctx.db.delete("postComments", report.targetId);
      }
    }
    await ctx.db.patch("contentReports", reportId, {
      status: remove5 ? "removed" : "dismissed",
      resolvedAt: new Date(ctx.now()).toISOString(),
      resolvedBy: admin2._id,
      resolutionNote: text || void 0
    });
    if (!remove5 && report.targetId && report.targetKind !== "profile" && report.targetKind !== "other") {
      if (await openReporters(ctx, report.targetKind, report.targetId) < AUTO_HIDE_AT)
        await unhideTarget(ctx, report.targetKind, report.targetId);
    }
    return null;
  }
});

// supabase/functions/_shared/modules/reviews.ts
var reviews_exports = {};
__export(reviews_exports, {
  listByReviewer: () => listByReviewer,
  listForSeller: () => listForSeller,
  myReview: () => myReview,
  remove: () => remove4,
  save: () => save
});
var BODY_MAX = 1e3;
async function findReview(ctx, sellerId, reviewerId) {
  return await ctx.db.first(
    "reviews",
    sql`where seller_id = ${sellerId}::uuid and reviewer_id = ${reviewerId}::uuid`
  );
}
var listForSeller = query({
  args: { sellerId: v.id("users"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { sellerId, paginationOpts }) => {
    const result = await ctx.db.paginate(
      "reviews",
      {
        where: sql`seller_id = ${sellerId}::uuid`,
        order: [{ column: "created_at", cast: "timestamptz" }],
        direction: "desc"
      },
      paginationOpts
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
            reviewer: reviewer ? {
              _id: reviewer._id,
              name: publicSellerName(reviewer),
              avatarUrl: reviewer.avatarStorageId ? await ctx.storage.getUrl(reviewer.avatarStorageId) : null
            } : null
          };
        })
      )
    };
  }
});
var listByReviewer = query({
  args: { reviewerId: v.id("users"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { reviewerId, paginationOpts }) => {
    const result = await ctx.db.paginate(
      "reviews",
      {
        where: sql`reviewer_id = ${reviewerId}::uuid`,
        order: [{ column: "created_at", cast: "timestamptz" }],
        direction: "desc"
      },
      paginationOpts
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
            seller: seller ? {
              _id: seller._id,
              name: publicSellerName(seller),
              avatarUrl: seller.avatarStorageId ? await ctx.storage.getUrl(seller.avatarStorageId) : null
            } : null
          };
        })
      )
    };
  }
});
var myReview = query({
  args: { sellerId: v.id("users") },
  handler: async (ctx, { sellerId }) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    const [can, eligible, review3] = await Promise.all([
      getCapabilities(ctx, me),
      canReview(ctx, me._id, sellerId),
      findReview(ctx, sellerId, me._id)
    ]);
    return {
      eligible: can.buy && eligible,
      review: review3 ? { rating: review3.rating, body: review3.body } : null
    };
  }
});
var save = mutation({
  args: { sellerId: v.id("users"), rating: v.number(), body: v.string() },
  handler: async (ctx, { sellerId, rating, body }) => {
    const me = await requireCapability(ctx, "buy");
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Pick a rating from 1 to 5 stars"
      });
    const text = body.trim();
    if (text.length > BODY_MAX)
      throw new AppError({
        code: "BAD_REQUEST",
        message: `Reviews can be up to ${BODY_MAX} characters`
      });
    if (!await canReview(ctx, me._id, sellerId))
      throw new AppError({
        code: "FORBIDDEN",
        message: "You can review a seller after messaging them or buying from them"
      });
    const existing = await findReview(ctx, sellerId, me._id);
    const updatedAt = new Date(ctx.now()).toISOString();
    if (existing) {
      await ctx.db.patch("reviews", existing._id, {
        rating,
        body: text,
        updatedAt
      });
      await bumpStats(ctx, sellerId, { ratingSum: rating - existing.rating });
    } else {
      await ctx.db.insert("reviews", {
        sellerId,
        reviewerId: me._id,
        rating,
        body: text,
        updatedAt
      });
      await bumpStats(ctx, sellerId, { reviewCount: 1, ratingSum: rating });
    }
    return null;
  }
});
var remove4 = mutation({
  args: { sellerId: v.id("users") },
  handler: async (ctx, { sellerId }) => {
    const me = await requireUser(ctx);
    const existing = await findReview(ctx, sellerId, me._id);
    if (!existing) return null;
    await ctx.db.delete("reviews", existing._id);
    await bumpStats(ctx, sellerId, {
      reviewCount: -1,
      ratingSum: -existing.rating
    });
    return null;
  }
});

// supabase/functions/_shared/modules/shipping.ts
var shipping_exports = {};
__export(shipping_exports, {
  _applyTracking: () => _applyTracking,
  _clearLabel: () => _clearLabel,
  _prepareRates: () => _prepareRates,
  _saveLabel: () => _saveLabel,
  _saveShipment: () => _saveShipment,
  _shipmentFor: () => _shipmentFor,
  _trackingTarget: () => _trackingTarget,
  buyLabel: () => buyLabel,
  getRates: () => getRates,
  mode: () => mode,
  nextTracking: () => nextTracking,
  refreshTracking: () => refreshTracking,
  voidLabel: () => voidLabel
});
var nowIso2 = (ctx) => new Date(ctx.now()).toISOString();
var mode = query({
  args: {},
  handler: async () => easyPostMode()
});
var _prepareRates = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const { order, me } = await getOrderAs(ctx, orderId, "seller", { pro: true });
    if (order.status === "awaiting_address")
      throw new AppError({ code: "CONFLICT", message: "The buyer hasn't added their address yet" });
    if (order.status !== "ready_to_ship")
      throw new AppError({ code: "CONFLICT", message: "This order already has a label" });
    if (!order.shipTo)
      throw new AppError({ code: "CONFLICT", message: "The buyer hasn't added their address yet" });
    const from = await getSavedAddress(ctx, me._id, "ship_from");
    if (!from)
      throw new AppError({ code: "BAD_REQUEST", message: "Add your return address first" });
    return { to: order.shipTo, from };
  }
});
var _saveShipment = internalMutation({
  args: { orderId: v.id("orders"), shipmentId: v.string() },
  handler: async (ctx, { orderId, shipmentId }) => {
    const { order } = await getOrderAs(ctx, orderId, "seller", { pro: true });
    if (order.status !== "ready_to_ship") return null;
    await ctx.db.patch("orders", orderId, { easypostShipmentId: shipmentId });
    return null;
  }
});
var getRates = action({
  args: {
    orderId: v.id("orders"),
    presetId: v.string(),
    weightOz: v.number()
  },
  handler: async (ctx, { orderId, presetId, weightOz }) => {
    const preset = PACKAGE_PRESETS.find((p) => p.id === presetId);
    if (!preset) throw new AppError({ code: "BAD_REQUEST", message: "Pick a package" });
    if (!Number.isFinite(weightOz) || weightOz < 0.5 || weightOz > MAX_WEIGHT_OZ)
      throw new AppError({ code: "BAD_REQUEST", message: "Enter the package weight in ounces" });
    const { to, from } = await ctx.runMutation(_prepareRates, { orderId });
    let shipment;
    try {
      shipment = await createShipment({
        from,
        to,
        parcel: {
          length: preset.length,
          width: preset.width,
          height: preset.height,
          weightOz: Math.round(weightOz * 10) / 10
        },
        reference: orderId
      });
    } catch (e) {
      throw shippingError(e, "Couldn't get shipping prices");
    }
    await ctx.runMutation(_saveShipment, { orderId, shipmentId: shipment.id });
    const rates = (shipment.rates ?? []).map((r) => ({
      id: r.id,
      carrier: r.carrier,
      service: r.service.replace(/([a-z])([A-Z])/g, "$1 $2"),
      cents: toCents(r.rate) ?? 0,
      days: r.delivery_days ?? r.est_delivery_days ?? null
    })).filter((r) => r.cents > 0).sort((a, b) => a.cents - b.cents);
    if (rates.length === 0) {
      const why = shipment.messages?.map((m) => m.message).filter(Boolean)[0];
      throw new AppError({
        code: "BAD_REQUEST",
        message: why ? `No prices available: ${why}` : "No prices available for this package"
      });
    }
    return { rates, mode: easyPostMode() };
  }
});
var _shipmentFor = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const { order } = await getOrderAs(ctx, orderId, "seller");
    return {
      status: order.status,
      shipmentId: order.easypostShipmentId ?? null,
      labelUrl: order.labelUrl ?? null
    };
  }
});
var _saveLabel = internalMutation({
  args: {
    orderId: v.id("orders"),
    shipmentId: v.string(),
    carrier: v.string(),
    service: v.string(),
    postageCents: v.optional(v.number()),
    trackingCode: v.string(),
    trackingUrl: v.optional(v.string()),
    labelUrl: v.string()
  },
  handler: async (ctx, { orderId, ...label }) => {
    const { order } = await getOrderAs(ctx, orderId, "seller", { pro: true });
    if (order.labelUrl) return null;
    if (order.easypostShipmentId !== label.shipmentId)
      throw new AppError({ code: "CONFLICT", message: "These prices are out of date. Get new prices." });
    const now = nowIso2(ctx);
    await ctx.db.patch("orders", orderId, {
      status: "label_created",
      carrier: label.carrier,
      service: label.service,
      postageCents: label.postageCents,
      trackingCode: label.trackingCode,
      trackingUrl: label.trackingUrl,
      trackingStatus: "pre_transit",
      labelUrl: label.labelUrl,
      labelCreatedAt: now,
      updatedAt: now
    });
    return null;
  }
});
var buyLabel = action({
  args: { orderId: v.id("orders"), rateId: v.string() },
  handler: async (ctx, { orderId, rateId }) => {
    const current = await ctx.runMutation(_shipmentFor, { orderId });
    if (current.labelUrl) return { labelUrl: current.labelUrl };
    if (current.status !== "ready_to_ship" || !current.shipmentId)
      throw new AppError({ code: "CONFLICT", message: "Get prices for this order first" });
    let shipment;
    try {
      shipment = await buyShipment(current.shipmentId, rateId);
    } catch (e) {
      throw shippingError(e, "Couldn't buy the label");
    }
    const labelUrl = labelUrlOf(shipment);
    if (!labelUrl || !shipment.tracking_code)
      throw new AppError({ code: "INTERNAL", message: "The label wasn't ready. Try again in a minute." });
    await ctx.runMutation(_saveLabel, {
      orderId,
      shipmentId: shipment.id,
      carrier: shipment.selected_rate?.carrier ?? "",
      service: (shipment.selected_rate?.service ?? "").replace(/([a-z])([A-Z])/g, "$1 $2"),
      postageCents: toCents(shipment.selected_rate?.rate),
      trackingCode: shipment.tracking_code,
      trackingUrl: shipment.tracker?.public_url ?? void 0,
      labelUrl
    });
    return { labelUrl };
  }
});
var _clearLabel = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const { order } = await getOrderAs(ctx, orderId, "seller");
    if (order.status !== "label_created") return null;
    await ctx.db.patch("orders", orderId, {
      status: "ready_to_ship",
      easypostShipmentId: void 0,
      carrier: void 0,
      service: void 0,
      postageCents: void 0,
      trackingCode: void 0,
      trackingUrl: void 0,
      trackingStatus: void 0,
      labelUrl: void 0,
      labelCreatedAt: void 0,
      updatedAt: nowIso2(ctx)
    });
    return null;
  }
});
var voidLabel = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const current = await ctx.runMutation(_shipmentFor, { orderId });
    if (current.status !== "label_created" || !current.shipmentId)
      throw new AppError({
        code: "CONFLICT",
        message: "Only a label that hasn't been scanned by the carrier can be voided"
      });
    try {
      const res = await refundShipment(current.shipmentId);
      if (res.refund_status === "rejected" || res.refund_status === "not_applicable")
        throw new AppError({
          code: "CONFLICT",
          message: "The carrier wouldn't void this label (it may already be scanned)"
        });
    } catch (e) {
      throw shippingError(e, "Couldn't void the label");
    }
    await ctx.runMutation(_clearLabel, { orderId });
    return null;
  }
});
var _trackingTarget = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    let found;
    try {
      found = await getOrderAs(ctx, orderId, "buyer");
    } catch {
      found = await getOrderAs(ctx, orderId, "seller");
    }
    const o = found.order;
    return { shipmentId: o.easypostShipmentId ?? null, status: o.status, labelUrl: o.labelUrl ?? null };
  }
});
var _applyTracking = internalMutation({
  args: {
    orderId: v.id("orders"),
    trackingStatus: v.string(),
    trackingUrl: v.optional(v.string())
  },
  handler: async (ctx, { orderId, trackingStatus, trackingUrl }) => {
    const order = await ctx.db.get("orders", orderId);
    if (!order || order.status === "cancelled" || order.status === "delivered") return null;
    await ctx.db.patch("orders", orderId, nextTracking(order, trackingStatus, trackingUrl, nowIso2(ctx)));
    return null;
  }
});
function nextTracking(order, trackingStatus, trackingUrl, now) {
  const patch = {
    trackingStatus,
    trackingUrl: trackingUrl || order.trackingUrl,
    updatedAt: now
  };
  if (trackingStatus === "delivered") {
    patch.status = "delivered";
    patch.deliveredAt = now;
    patch.shippedAt = order.shippedAt ?? now;
  } else if (IN_TRANSIT_STATUSES.has(trackingStatus) && order.status === "label_created") {
    patch.status = "shipped";
    patch.shippedAt = now;
  }
  return patch;
}
var refreshTracking = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const target = await ctx.runMutation(_trackingTarget, { orderId });
    if (!target.shipmentId || !target.labelUrl) return null;
    try {
      const shipment = await getShipment(target.shipmentId);
      const tracker = shipment.tracker?.id ? await getTracker(shipment.tracker.id) : null;
      if (!tracker?.status) return null;
      await ctx.runMutation(_applyTracking, {
        orderId,
        trackingStatus: tracker.status,
        trackingUrl: tracker.public_url ?? void 0
      });
      return tracker.status;
    } catch (e) {
      throw shippingError(e, "Couldn't refresh tracking");
    }
  }
});

// supabase/functions/_shared/modules/subscriptions.ts
var subscriptions_exports = {};
__export(subscriptions_exports, {
  adminList: () => adminList,
  approve: () => approve,
  cancelRequest: () => cancelRequest,
  decline: () => decline,
  featured: () => featured,
  mine: () => mine4,
  requestPro: () => requestPro,
  revoke: () => revoke
});
var MAX_NOTE2 = 500;
var FEATURED_SELLERS = 8;
var mine4 = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    const sub = await getSubscription(ctx, me._id);
    const isPro = isProActive(sub, ctx.now());
    const plan = isPro ? "pro" : "free";
    return {
      plan,
      limits: PLAN_LIMITS[plan],
      status: sub?.status ?? null,
      expiresAt: isPro && sub ? sub.expiresAt : null,
      isAdmin: me.role === "admin"
    };
  }
});
var requestPro = mutation({
  args: {
    note: v.string(),
    /** Plan length the seller picked (1, 3, 6 or 12 months) */
    months: v.optional(v.number()),
    /** The seller wants to pay some way other than the standard subscription */
    payAnotherWay: v.optional(v.boolean())
  },
  handler: async (ctx, { note, months, payAnotherWay }) => {
    const user = await requireUser(ctx);
    if (user.accountType !== "seller")
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Pro is for sellers. Become a seller first."
      });
    if (note.length > MAX_NOTE2)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Message is too long"
      });
    if (months !== void 0 && !isAllowedMonths(months))
      throw new AppError({ code: "BAD_REQUEST", message: "Pick a valid plan" });
    const sub = await getSubscription(ctx, user._id);
    if (sub?.status === "pending")
      throw new AppError({
        code: "CONFLICT",
        message: "Your request is already being reviewed"
      });
    const fields = {
      status: "pending",
      requestedAt: new Date(ctx.now()).toISOString(),
      note: note.trim() || void 0,
      requestedMonths: months ?? 1,
      payAnotherWay: !!payAnotherWay
    };
    if (sub) await ctx.db.patch("subscriptions", sub._id, fields);
    else
      await ctx.db.insert("subscriptions", {
        userId: user._id,
        plan: "pro",
        expiresAt: "",
        ...fields
      });
    return null;
  }
});
var cancelRequest = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const sub = await getSubscription(ctx, user._id);
    if (!sub || sub.status !== "pending")
      throw new AppError({
        code: "BAD_REQUEST",
        message: "No pending request"
      });
    const status = isProActive(
      { status: "active", expiresAt: sub.expiresAt },
      ctx.now()
    ) ? "active" : "cancelled";
    await ctx.db.patch("subscriptions", sub._id, { status });
    return null;
  }
});
var adminList = query({
  args: {
    status: v.union(v.literal("pending"), v.literal("active")),
    paginationOpts: paginationOptsValidator
  },
  handler: async (ctx, { status, paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db.paginate(
      "subscriptions",
      status === "pending" ? {
        where: sql`status = 'pending'`,
        order: [{ column: "requested_at", cast: "timestamptz" }],
        direction: "asc"
      } : {
        // expires_at is set on every approved row
        where: sql`status = 'active' and expires_at is not null`,
        order: [{ column: "expires_at", cast: "timestamptz" }],
        direction: "asc"
      },
      paginationOpts
    );
    const now = ctx.now();
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (s) => {
          const user = await ctx.db.get("users", s.userId);
          return {
            _id: s._id,
            userId: s.userId,
            sellerName: user ? publicSellerName(user) : "Deleted user",
            email: user?.email ?? null,
            requestedAt: s.requestedAt,
            expiresAt: s.expiresAt || null,
            isCurrentlyPro: isProActive(
              { status: "active", expiresAt: s.expiresAt },
              now
            ),
            note: s.note ?? null,
            requestedMonths: s.requestedMonths ?? null,
            payAnotherWay: !!s.payAnotherWay
          };
        })
      )
    };
  }
});
var approve = mutation({
  args: { subscriptionId: v.id("subscriptions"), months: v.number() },
  handler: async (ctx, { subscriptionId, months }) => {
    await requireAdmin(ctx);
    if (!isAllowedMonths(months))
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Pick a valid length"
      });
    const sub = await ctx.db.get("subscriptions", subscriptionId);
    if (!sub)
      throw new AppError({ code: "NOT_FOUND", message: "Request not found" });
    const expiresAt = nextExpiry(
      { status: "active", expiresAt: sub.expiresAt },
      months,
      ctx.now()
    );
    await ctx.db.patch("subscriptions", subscriptionId, {
      status: "active",
      expiresAt
    });
    return { expiresAt };
  }
});
var decline = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    await requireAdmin(ctx);
    const sub = await ctx.db.get("subscriptions", subscriptionId);
    if (!sub || sub.status !== "pending")
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Not a pending request"
      });
    const stillPro = isProActive(
      { status: "active", expiresAt: sub.expiresAt },
      ctx.now()
    );
    await ctx.db.patch("subscriptions", subscriptionId, {
      status: stillPro ? "active" : "declined"
    });
    return null;
  }
});
var revoke = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    await requireAdmin(ctx);
    const sub = await ctx.db.get("subscriptions", subscriptionId);
    if (!sub) throw new AppError({ code: "NOT_FOUND", message: "Not found" });
    await ctx.db.patch("subscriptions", subscriptionId, {
      status: "cancelled",
      expiresAt: ""
    });
    return null;
  }
});
var featured = query({
  args: {},
  handler: async (ctx) => {
    const nowIso3 = new Date(ctx.now()).toISOString();
    ctx.db.touch("subscriptions");
    const listings = await ctx.db.docs(
      "listings",
      sql`
        select l.* from (
          select user_id, expires_at from public.subscriptions
           where status = 'active' and expires_at > ${nowIso3}::timestamptz
           order by expires_at desc, id desc limit ${FEATURED_SELLERS}
        ) s
        cross join lateral (
          select * from public.listings
           where seller_id = s.user_id and status = 'active'
           order by created_at desc, id desc limit 1
        ) l
        order by s.expires_at desc`
    );
    return await Promise.all(listings.map((l) => toCard(ctx, l)));
  }
});

// supabase/functions/_shared/modules/unlocks.ts
var unlocks_exports = {};
__export(unlocks_exports, {
  pendingForListing: () => pendingForListing,
  request: () => request,
  respond: () => respond3
});
var PENDING_LIMIT = 50;
var request = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const user = await requireCapability(ctx, "buy");
    const listing = await ctx.db.get("listings", listingId);
    if (!listing?.paywall)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Locked listing not found"
      });
    if (listing.sellerId === user._id)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "This is your own listing"
      });
    if (listing.status !== "active")
      throw new AppError({
        code: "BAD_REQUEST",
        message: "This listing is no longer for sale"
      });
    const existing = await getUnlock(ctx, listingId, user._id);
    const requestedAt = new Date(ctx.now()).toISOString();
    if (!existing) {
      await ctx.db.insert("unlocks", {
        listingId,
        buyerId: user._id,
        sellerId: listing.sellerId,
        status: "pending",
        requestedAt
      });
    } else if (existing.status === "declined" || existing.status === "granted" && (unlockExpiry(existing) ?? 0) <= ctx.now()) {
      await ctx.db.patch("unlocks", existing._id, {
        status: "pending",
        requestedAt
      });
    }
    return null;
  }
});
var pendingForListing = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const me = await getCurrentUserDoc(ctx);
    const listing = await ctx.db.get("listings", listingId);
    if (!me || !listing || listing.sellerId !== me._id) return [];
    const rows = await ctx.db.select(
      "unlocks",
      sql`where listing_id = ${listingId}::uuid and status = 'pending' order by created_at, id limit ${PENDING_LIMIT}`
    );
    const buyers = await Promise.all(
      rows.map((r) => ctx.db.get("users", r.buyerId))
    );
    return rows.map((r, i) => {
      const buyer = buyers[i];
      return {
        _id: r._id,
        requestedAt: r.requestedAt,
        buyerName: buyer ? publicSellerName(buyer) : "Deleted user"
      };
    });
  }
});
var respond3 = mutation({
  args: { unlockId: v.id("unlocks"), grant: v.boolean() },
  handler: async (ctx, { unlockId, grant }) => {
    const user = await requireUser(ctx);
    const unlock = await ctx.db.get("unlocks", unlockId);
    if (!unlock)
      throw new AppError({ code: "NOT_FOUND", message: "Request not found" });
    if (unlock.sellerId !== user._id)
      throw new AppError({ code: "FORBIDDEN", message: "Not your listing" });
    if (unlock.status !== "pending") return null;
    await ctx.db.patch("unlocks", unlockId, {
      status: grant ? "granted" : "declined",
      ...grant ? { grantedAt: new Date(ctx.now()).toISOString() } : {}
    });
    if (grant) await bumpStats(ctx, unlock.sellerId, { salesCount: 1 });
    return null;
  }
});

// supabase/functions/_shared/modules/users.ts
var users_exports = {};
__export(users_exports, {
  addProfilePhoto: () => addProfilePhoto,
  buyerDetailsValidator: () => buyerDetailsValidator,
  findMembers: () => findMembers,
  finishSignup: () => finishSignup,
  getCurrentUser: () => getCurrentUser,
  getProfile: () => getProfile,
  idByUsername: () => idByUsername,
  menu: () => menu,
  myAccess: () => myAccess,
  mySettings: () => mySettings,
  photosByUser: () => photosByUser,
  photosPage: () => photosPage,
  profileAccess: () => profileAccess,
  removeProfilePhoto: () => removeProfilePhoto,
  search: () => search,
  sellerDetailsValidator: () => sellerDetailsValidator,
  setAccountType: () => setAccountType,
  setProfilePrivate: () => setProfilePrivate,
  topSellers: () => topSellers,
  updateBuyerDetails: () => updateBuyerDetails,
  updateCurrentUser: () => updateCurrentUser,
  updateProfile: () => updateProfile,
  updateSellerDetails: () => updateSellerDetails,
  updateSettings: () => updateSettings,
  usernameAvailable: () => usernameAvailable
});

// supabase/functions/_shared/domain/buyerDetails.ts
var optionsOf = (key) => SELLER_DETAIL_FIELDS.find((f) => f.key === key)?.options ?? [];
var BUYER_DETAIL_FIELDS = [
  { key: "gender", label: "Gender", options: optionsOf("gender") },
  { key: "ageRange", label: "Age", options: optionsOf("ageRange") },
  { key: "ethnicity", label: "Ethnicity", options: optionsOf("ethnicity") },
  { key: "bodySize", label: "Body Size", options: optionsOf("bodySize") },
  { key: "country", label: "Country", options: optionsOf("country") }
];
var LOOKING_FOR_OPTIONS = [
  "Worn panties",
  "Bras",
  "Socks",
  "Shoes",
  "Gym wear",
  "Lingerie",
  "Instant Photos",
  "Instant Vids",
  "Custom requests"
];
function invalidBuyerDetail(details) {
  for (const field of BUYER_DETAIL_FIELDS) {
    const value = details[field.key];
    if (value !== void 0 && !field.options.includes(value)) {
      return `Invalid ${field.label.toLowerCase()}`;
    }
  }
  const picks = details.lookingFor ?? [];
  const allowed = LOOKING_FOR_OPTIONS;
  if (picks.some((p) => !allowed.includes(p)) || new Set(picks).size !== picks.length) {
    return 'Invalid "looking for" choice';
  }
  return null;
}

// supabase/functions/_shared/modules/users.ts
var opt = v.optional(v.string());
var sellerDetailsValidator = v.object({
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
  pregnant: opt
});
var buyerDetailsValidator = v.object({
  gender: opt,
  ageRange: opt,
  ethnicity: opt,
  bodySize: opt,
  country: opt,
  lookingFor: v.optional(v.array(v.string(), 20))
});
var updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new AppError({
        code: "UNAUTHENTICATED",
        message: "User not logged in"
      });
    }
    const existing = await getCurrentUserDoc(ctx);
    if (existing) return existing._id;
    if (identity.email && identity.emailVerified) {
      const legacy = await ctx.db.first(
        "users",
        sql`where lower(email) = lower(${identity.email})
              and token_identifier not like 'supabase|%'
            order by created_at`
      );
      if (legacy) {
        await ctx.db.patch("users", legacy._id, {
          tokenIdentifier: identity.tokenIdentifier,
          ...legacy.name || !identity.name ? {} : { name: identity.name }
        });
        return legacy._id;
      }
    }
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name,
      email: identity.email,
      verified: false,
      ageVerified: false
    });
  }
});
var getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new AppError({
        code: "UNAUTHENTICATED",
        message: "Called getCurrentUser without authentication present"
      });
    }
    return await getCurrentUserDoc(ctx);
  }
});
var menu = query({
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
      isPro: await getPlan(ctx, me._id) === "pro",
      avatarUrl: me.avatarStorageId ? await ctx.storage.getUrl(me.avatarStorageId) : null
    };
  }
});
var myAccess = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    const isPro = await getPlan(ctx, me._id) === "pro";
    return {
      accountType: me.accountType ?? null,
      isPro,
      isAdmin: me.role === "admin",
      ageVerified: isAgeVerified(me.ageVerified),
      can: await getCapabilities(ctx, me)
    };
  }
});
var setAccountType = mutation({
  args: { accountType: v.union(v.literal("buyer"), v.literal("seller")) },
  handler: async (ctx, { accountType }) => {
    const user = await requireUser(ctx);
    if (user.accountType === accountType) return null;
    if (user.accountType === "seller" && user.role !== "admin") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Seller accounts can't switch back to buyer"
      });
    }
    await ctx.db.patch("users", user._id, { accountType });
    return null;
  }
});
var usernameAvailable = query({
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
  }
});
var finishSignup = mutation({
  args: {
    accountType: v.union(v.literal("buyer"), v.literal("seller")),
    country: opt,
    gender: opt,
    ageRange: opt
  },
  handler: async (ctx, { accountType, country, gender, ageRange }) => {
    const user = await requireUser(ctx);
    if (user.accountType) return null;
    const details = { country, gender, ageRange };
    const problem = accountType === "buyer" ? invalidBuyerDetail(details) : invalidSellerDetail(details);
    if (problem) throw new AppError({ code: "BAD_REQUEST", message: problem });
    const clean2 = Object.fromEntries(Object.entries(details).filter(([, x]) => x));
    await ctx.db.patch("users", user._id, {
      accountType,
      ...country && !user.location ? { location: country } : {},
      ...accountType === "buyer" ? { buyerDetails: { ...user.buyerDetails, ...clean2 } } : { sellerDetails: { ...user.sellerDetails, ...clean2 } }
    });
    return null;
  }
});
async function withPhotoUrls(ctx, rows) {
  const urls = await Promise.all(
    rows.map((r) => ctx.storage.getUrl(r.storageId))
  );
  return rows.flatMap((r, i) => {
    const url = urls[i];
    return url ? [{ _id: r._id, url }] : [];
  });
}
async function listProfilePhotos(ctx, userId) {
  const rows = await ctx.db.select(
    "profilePhotos",
    sql`where user_id = ${userId}::uuid order by created_at desc, id desc limit ${PROFILE_PHOTO_PREVIEW}`
  );
  return withPhotoUrls(ctx, rows);
}
function photosSource(userId, albumId, isAdmin) {
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
var photosByUser = query({
  args: { userId: v.id("users"), albumId: v.optional(v.id("photoAlbums")), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { userId, albumId, paginationOpts }) => {
    const limit = Math.min(Math.max(1, Math.floor(paginationOpts.numItems)), 100);
    const cursor = paginationOpts.cursor;
    const offset = cursor?.startsWith("o:") ? Math.max(0, Number(cursor.slice(2)) || 0) : 0;
    const { page, more } = await loadPhotos(ctx, userId, albumId, offset, limit);
    return { page, isDone: !more, continueCursor: `o:${offset + page.length}` };
  }
});
var photosPage = query({
  args: { userId: v.id("users"), albumId: v.optional(v.id("photoAlbums")), page: v.number() },
  handler: async (ctx, { userId, albumId, page }) => {
    const PAGE_SIZE = 12;
    const me = await getCurrentUserDoc(ctx);
    const total = Number(
      await ctx.db.scalar(sql`select count(*) from (${photosSource(userId, albumId, me?.role === "admin")}) photos`) ?? 0
    );
    const offset = Math.max(0, Math.floor(page)) * PAGE_SIZE;
    const { page: items } = await loadPhotos(ctx, userId, albumId, offset, PAGE_SIZE);
    return { total, pageSize: PAGE_SIZE, items };
  }
});
async function loadPhotos(ctx, userId, albumId, offset, limit) {
  ctx.db.touch("profilePhotos", "posts", "photoLikes", "photoComments", "postLikes");
  const me = await getCurrentUserDoc(ctx);
  const rows = await ctx.db.rows(sql`
      select * from (${photosSource(userId, albumId, me?.role === "admin")}) photos
      order by created_at desc, source_id desc, ord
      limit ${limit + 1} offset ${offset}`);
  const pageRows = rows.slice(0, limit);
  const urls = await Promise.all(pageRows.map((r) => ctx.storage.getUrl(String(r.storage_id))));
  const ownIds = [...new Set(pageRows.filter((r) => r.own === true).map((r) => String(r.source_id)))];
  const postIds = [...new Set(pageRows.filter((r) => r.own !== true).map((r) => String(r.source_id)))];
  const likerIds = /* @__PURE__ */ new Map();
  const likedByMe = /* @__PURE__ */ new Set();
  const collect = async (table, col, ids) => {
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
      likerIds.set(String(r.target), [...likerIds.get(String(r.target)) ?? [], String(r.user_id)]);
    if (me) {
      const mine6 = await ctx.db.rows(sql`
          select ${raw(col)}::text as target from public.${raw(table)}
           where user_id = ${me._id}::uuid and ${raw(col)} = any(${ids}::uuid[])`);
      for (const r of mine6) likedByMe.add(String(r.target));
    }
  };
  await Promise.all([
    collect("photo_likes", "photo_id", ownIds),
    collect("post_likes", "post_id", postIds)
  ]);
  const allLikers = [...new Set([...likerIds.values()].flat())];
  const likerDocs = new Map(
    (await toLikers(ctx, allLikers)).map((l) => [String(l._id), l])
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
        photoId: own ? sourceId : null,
        postId: own ? null : sourceId,
        caption: r.caption ? String(r.caption) : "",
        likeCount: Number(r.likes ?? 0),
        commentCount: Number(r.comments ?? 0),
        likedByMe: likedByMe.has(sourceId),
        likers: (likerIds.get(sourceId) ?? []).flatMap((id) => {
          const l = likerDocs.get(id);
          return l ? [l] : [];
        })
      }
    ];
  });
  return { page, more: rows.length > limit };
}
var PHOTO_LIKERS_SHOWN = 6;
var isPrivateProfile = (user) => user.settings?.profilePrivate === "yes";
var canViewProfile = (user, me) => !isPrivateProfile(user) || me?._id === user._id || me?.role === "admin";
var profileAccess = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get("users", userId);
    if (!user) return null;
    const me = await getCurrentUserDoc(ctx);
    if (canViewProfile(user, me)) return { locked: false, name: null, avatarUrl: null };
    return {
      locked: true,
      name: publicSellerName(user),
      avatarUrl: user.avatarStorageId ? await ctx.storage.getUrl(user.avatarStorageId) : null
    };
  }
});
var setProfilePrivate = mutation({
  args: { isPrivate: v.boolean() },
  handler: async (ctx, { isPrivate }) => {
    const user = await requireUser(ctx);
    await ctx.db.patch("users", user._id, {
      settings: { ...user.settings, profilePrivate: isPrivate ? "yes" : "no" }
    });
    return null;
  }
});
var getProfile = query({
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
      isPro: await getPlan(ctx, user._id) === "pro",
      verified: !!user.verified,
      accountType: user.accountType ?? null,
      avatarUrl: user.avatarStorageId ? await ctx.storage.getUrl(user.avatarStorageId) : null,
      photos: await listProfilePhotos(ctx, user._id),
      stats: summarize(await getStats(ctx, user._id)),
      sellerDetails: user.accountType === "buyer" ? {} : user.sellerDetails ?? {},
      buyerDetails: user.accountType === "buyer" ? user.buyerDetails ?? {} : {},
      // Shown in the profile's About section
      paymentMethods: user.accountType === "buyer" ? [] : user.settings?.paymentMethods ?? [],
      offerings: user.accountType === "buyer" ? [] : user.settings?.offerings ?? [],
      counts: await profileCounts(ctx, user._id),
      // Buyers aren't rated; their profile shows the reviews they've written
      reviewsWritten: user.accountType === "buyer" ? await reviewsWritten(ctx, user._id) : null,
      activity: await getActivity(ctx, user._id),
      badges: await getBadges(ctx, user)
    };
  }
});
async function reviewsWritten(ctx, userId) {
  ctx.db.touch("reviews");
  const [row] = await ctx.db.rows(sql`
    select count(*)::int as n, coalesce(avg(rating), 0)::float8 as average
    from public.reviews where reviewer_id = ${userId}::uuid`);
  const count = Number(row.n);
  return { count, average: count ? Math.round(Number(row.average) * 10) / 10 : 0 };
}
async function profileCounts(ctx, userId) {
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
    profilePhotos: Number(row.profile_photos)
  };
}
var updateSellerDetails = mutation({
  args: { details: sellerDetailsValidator },
  handler: async (ctx, { details }) => {
    const user = await requireUser(ctx);
    if (user.accountType !== "seller" && user.role !== "admin") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Only sellers have these profile details"
      });
    }
    const problem = invalidSellerDetail(details);
    if (problem) throw new AppError({ code: "BAD_REQUEST", message: problem });
    await ctx.db.patch("users", user._id, { sellerDetails: details });
    return null;
  }
});
var settingsValidator = v.object({
  profilePrivate: opt,
  siteVisibility: opt,
  emailNotifications: opt,
  marketingEmails: opt,
  webPush: opt,
  messagesFrom: opt,
  socialFeature: opt,
  paymentMethods: v.optional(v.array(v.string(), PAYMENT_METHODS.length)),
  offerings: v.optional(v.array(v.string(), OFFERINGS.length))
});
var mySettings = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    return me ? withDefaults(me.settings) : null;
  }
});
var updateSettings = mutation({
  args: { settings: settingsValidator },
  handler: async (ctx, { settings }) => {
    const user = await requireUser(ctx);
    if (user.accountType !== "seller" && user.role !== "admin") {
      throw new AppError({ code: "FORBIDDEN", message: "These settings are for sellers" });
    }
    const problem = invalidSetting(settings);
    if (problem) throw new AppError({ code: "BAD_REQUEST", message: problem });
    const unique = (list5) => list5 ? [...new Set(list5)] : void 0;
    const next = { ...user.settings };
    for (const [key, value] of Object.entries(settings)) {
      if (value !== void 0) next[key] = value;
    }
    next.paymentMethods = unique(next.paymentMethods);
    next.offerings = unique(next.offerings);
    await ctx.db.patch("users", user._id, { settings: next });
    return null;
  }
});
var updateBuyerDetails = mutation({
  args: { details: buyerDetailsValidator },
  handler: async (ctx, { details }) => {
    const user = await requireUser(ctx);
    if (user.accountType !== "buyer") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Only buyers have these profile details"
      });
    }
    const problem = invalidBuyerDetail(details);
    if (problem) throw new AppError({ code: "BAD_REQUEST", message: problem });
    await ctx.db.patch("users", user._id, { buyerDetails: details });
    return null;
  }
});
var updateProfile = mutation({
  args: {
    shopName: v.string(),
    bio: v.string(),
    location: v.string(),
    // undefined = keep current picture, null = remove it, id = replace it
    avatarStorageId: v.optional(v.union(v.storageId(), v.null()))
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.shopName.length > 40 || args.bio.length > 300 || args.location.length > 60) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Profile fields are too long"
      });
    }
    const avatarChanged = args.avatarStorageId !== void 0 && args.avatarStorageId !== user.avatarStorageId;
    if (avatarChanged && args.avatarStorageId)
      assertOwnFiles([args.avatarStorageId], user._id, "public");
    if (avatarChanged && user.avatarStorageId) {
      ctx.storage.delete(user.avatarStorageId);
    }
    await ctx.db.patch("users", user._id, {
      shopName: args.shopName.trim() || void 0,
      bio: args.bio.trim() || void 0,
      location: args.location.trim() || void 0,
      ...avatarChanged ? { avatarStorageId: args.avatarStorageId ?? void 0 } : {}
    });
    return null;
  }
});
var addProfilePhoto = mutation({
  args: {
    storageId: v.storageId(),
    description: v.optional(v.string()),
    albumId: v.optional(v.id("photoAlbums"))
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
    if (user.accountType !== "seller" && user.role !== "admin") {
      const count = Number(
        await ctx.db.scalar(
          sql`select count(*)::int from public.profile_photos where user_id = ${user._id}::uuid`
        )
      );
      if (count >= BUYER_PHOTO_MAX) {
        ctx.storage.delete(storageId);
        throw new AppError({
          code: "FORBIDDEN",
          message: `Buyers can have up to ${BUYER_PHOTO_MAX} profile photos`
        });
      }
    }
    return await ctx.db.insert("profilePhotos", {
      userId: user._id,
      storageId,
      ...caption ? { description: caption } : {},
      ...albumId ? { albumId } : {}
    });
  }
});
var removeProfilePhoto = mutation({
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
  }
});
var search = query({
  args: { search: v.string() },
  handler: async (ctx, { search: text }) => {
    const term = text.trim().slice(0, 60);
    if (term.length < 2) return [];
    const pattern = `%${term.replace(/[\\%_]/g, (c2) => `\\${c2}`)}%`;
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
        _id: r.id,
        name: r.display_name,
        verified: !!r.verified,
        avatarUrl: r.avatar_storage_id ? await ctx.storage.getUrl(r.avatar_storage_id) : null
      }))
    );
  }
});
var findMembers = query({
  args: { accountType: v.union(v.literal("seller"), v.literal("buyer")), search: opt },
  handler: async (ctx, { accountType, search: text }) => {
    const me = await getCurrentUserDoc(ctx);
    const term = (text ?? "").trim().slice(0, 60);
    const pattern = term ? `%${term.replace(/[\\%_]/g, (c2) => `\\${c2}`)}%` : null;
    const rows = await ctx.db.rows(sql`
      select u.id, coalesce(nullif(u.shop_name, ''), u.name) as display_name,
             u.avatar_storage_id, u.verified
        from public.users u
       where u.account_type = ${accountType}
         and coalesce(nullif(u.shop_name, ''), u.name) is not null
         ${pattern ? sql`and coalesce(nullif(u.shop_name, ''), u.name) ilike ${pattern}` : empty}
         ${me ? sql`and u.id <> ${me._id}::uuid
                   and not exists (
                     select 1 from public.blocks b
                      where (b.blocker_id = ${me._id}::uuid and b.blocked_id = u.id)
                         or (b.blocker_id = u.id and b.blocked_id = ${me._id}::uuid))` : empty}
       order by u.verified desc, u.created_at desc
       limit 48`);
    return await Promise.all(
      rows.map(async (r) => ({
        _id: r.id,
        name: r.display_name,
        verified: !!r.verified,
        avatarUrl: r.avatar_storage_id ? await ctx.storage.getUrl(r.avatar_storage_id) : null
      }))
    );
  }
});
var idByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const u = await ctx.db.first("users", sql`where username = ${username.toLowerCase().slice(0, 60)}`);
    return u?._id ?? null;
  }
});
var topSellers = query({
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
        _id: r.id,
        username: r.username,
        avatarUrl: await ctx.storage.getUrl(r.avatar_storage_id)
      }))
    );
    return out.filter((r) => r.avatarUrl);
  }
});

// supabase/functions/_shared/modules/verification.ts
var verification_exports = {};
__export(verification_exports, {
  adminPending: () => adminPending2,
  mine: () => mine5,
  review: () => review2,
  revoke: () => revoke2,
  submit: () => submit3
});
var REASON_MAX2 = 300;
async function getVerification(ctx, userId) {
  return await ctx.db.first(
    "verifications",
    sql`where user_id = ${userId}::uuid`
  );
}
var mine5 = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return null;
    const row = await getVerification(ctx, me._id);
    return {
      verified: !!me.verified,
      status: row?.status ?? null,
      reason: row?.status === "rejected" ? row.reason ?? null : null
    };
  }
});
var submit3 = mutation({
  args: { photoStorageId: v.storageId() },
  handler: async (ctx, { photoStorageId }) => {
    const me = await requireUser(ctx);
    if (!isOwnFile(photoStorageId, me._id, "private"))
      throw new AppError({ code: "NOT_FOUND", message: "Photo not found" });
    const reject = (message, code = "BAD_REQUEST") => new AppError({ code, message });
    if (me.accountType !== "seller" && me.role !== "admin")
      throw reject("Only seller accounts can get verified", "FORBIDDEN");
    if (me.verified) throw reject("You're already verified", "CONFLICT");
    const contentType = await ctx.storage.getContentType(photoStorageId);
    if (contentType === void 0)
      throw new AppError({ code: "NOT_FOUND", message: "Photo not found" });
    if (contentType && !contentType.startsWith("image/"))
      throw reject("Please upload a photo");
    const existing = await getVerification(ctx, me._id);
    const fields = {
      status: "pending",
      photoStorageId,
      requestedAt: new Date(ctx.now()).toISOString(),
      reviewedAt: void 0,
      reason: void 0
    };
    if (existing) {
      ctx.storage.delete(existing.photoStorageId);
      await ctx.db.patch("verifications", existing._id, fields);
    } else {
      await ctx.db.insert("verifications", { userId: me._id, ...fields });
    }
    return null;
  }
});
var adminPending2 = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db.paginate(
      "verifications",
      {
        where: sql`status = 'pending'`,
        order: [{ column: "requested_at", cast: "timestamptz" }],
        direction: "asc"
      },
      paginationOpts
    );
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (r) => {
          const user = await ctx.db.get("users", r.userId);
          return {
            _id: r._id,
            userId: r.userId,
            sellerName: user ? publicSellerName(user) : "Deleted user",
            email: user?.email ?? null,
            requestedAt: r.requestedAt,
            photoUrl: r.photoStorageId ? await ctx.storage.getUrl(r.photoStorageId) : null
          };
        })
      )
    };
  }
});
var review2 = mutation({
  args: {
    verificationId: v.id("verifications"),
    approve: v.boolean(),
    reason: v.optional(v.string())
  },
  handler: async (ctx, { verificationId, approve: approve2, reason }) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get("verifications", verificationId);
    if (!row || row.status !== "pending")
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Not a pending request"
      });
    const note = reason?.trim();
    if (note && note.length > REASON_MAX2)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Reason is too long"
      });
    ctx.storage.delete(row.photoStorageId);
    await ctx.db.patch("verifications", verificationId, {
      status: approve2 ? "approved" : "rejected",
      photoStorageId: void 0,
      reviewedAt: new Date(ctx.now()).toISOString(),
      reason: approve2 ? void 0 : note || void 0
    });
    await ctx.db.patch("users", row.userId, { verified: approve2 });
    return null;
  }
});
var revoke2 = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    await ctx.db.patch("users", userId, { verified: false });
    const row = await getVerification(ctx, userId);
    if (row)
      await ctx.db.patch("verifications", row._id, {
        status: "rejected",
        reason: "Badge removed by an admin"
      });
    return null;
  }
});

// supabase/functions/_shared/registry.ts
function functionsOf(mod) {
  const out = {};
  for (const [name, value] of Object.entries(mod)) {
    if (value && typeof value === "object" && "kind" in value && "handler" in value)
      out[name] = value;
  }
  return out;
}
var registry = {
  accountDeletion: functionsOf(accountDeletion_exports),
  activity: functionsOf(activity_exports),
  ageVerification: functionsOf(ageVerification_exports),
  albums: functionsOf(albums_exports),
  photos: functionsOf(photos_exports),
  auctions: functionsOf(auctions_exports),
  blocks: functionsOf(blocks_exports),
  customRequests: functionsOf(customRequests_exports),
  favorites: functionsOf(favorites_exports),
  follows: functionsOf(follows_exports),
  listings: functionsOf(listings_exports),
  messages: functionsOf(messages_exports),
  notifications: functionsOf(notifications_exports),
  orders: functionsOf(orders_exports),
  posts: functionsOf(posts_exports),
  reports: functionsOf(reports_exports),
  reviews: functionsOf(reviews_exports),
  shipping: functionsOf(shipping_exports),
  subscriptions: functionsOf(subscriptions_exports),
  unlocks: functionsOf(unlocks_exports),
  users: functionsOf(users_exports),
  verification: functionsOf(verification_exports)
};

// supabase/functions/api/index.ts
var env = (name) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
};
var db = (0, import_npm_postgres_3_4.default)(env("SUPABASE_DB_URL"), {
  prepare: false,
  // required behind Supabase's transaction pooler
  max: 4,
  idle_timeout: 20,
  connect_timeout: 10,
  connection: { TimeZone: "UTC" }
});
var runner = {
  async transaction(mode2, fn) {
    const options = mode2 === "read" ? "isolation level repeatable read read only" : "isolation level serializable";
    return await db.begin(
      options,
      (tx) => fn({
        query: async (text, params) => await tx.unsafe(text, params)
      })
    );
  }
};
var supabaseUrl = env("SUPABASE_URL");
var publicBase = (Deno.env.get("PUBLIC_SUPABASE_URL") ?? supabaseUrl).replace(
  /\/$/,
  ""
);
var admin = (0, import_supabase_js_2_49.createClient)(supabaseUrl, env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false }
});
var toPublic = (url) => url.replace(/^https?:\/\/[^/]+/, publicBase);
var encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");
var storage = {
  publicUrl: (bucket, path) => `${publicBase}/storage/v1/object/public/${bucket}/${encodePath(path)}`,
  async signedUrls(bucket, paths, ttl) {
    const { data, error } = await admin.storage.from(bucket).createSignedUrls(paths, ttl);
    if (error) throw error;
    const byPath = new Map(
      (data ?? []).map((d) => [d.path, d.error ? null : d.signedUrl])
    );
    return paths.map((p) => {
      const url = byPath.get(p);
      return url ? toPublic(url) : null;
    });
  },
  async remove(bucket, paths) {
    const { error } = await admin.storage.from(bucket).remove(paths);
    if (error) throw error;
  },
  async createUploadUrl(bucket, path) {
    const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) throw error ?? new Error("Could not create upload URL");
    return { signedUrl: toPublic(data.signedUrl), token: data.token };
  },
  async contentType(txDb, bucket, path) {
    const rows = await txDb.rows(
      sql`select metadata ->> 'mimetype' as content_type from storage.objects where bucket_id = ${bucket} and name = ${path}`
    );
    if (rows.length === 0) return void 0;
    return rows[0].content_type ?? null;
  }
};
var IDENTITY_CACHE_MS = 6e4;
var identities = /* @__PURE__ */ new Map();
async function identify(token) {
  if (!token) return null;
  const now = Date.now();
  const cached = identities.get(token);
  if (cached && cached.until > now) return cached.identity;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    identities.delete(token);
    throw new AppError({
      code: "UNAUTHENTICATED",
      message: "Your session has expired. Please sign in again"
    });
  }
  const user = data.user;
  const meta = user.user_metadata ?? {};
  const identity = {
    tokenIdentifier: `supabase|${user.id}`,
    name: typeof meta.name === "string" && meta.name.trim() ? meta.name.trim() : void 0,
    email: user.email ?? void 0,
    emailVerified: !!user.email_confirmed_at
  };
  if (identities.size > 5e3) identities.clear();
  identities.set(token, { identity, until: now + IDENTITY_CACHE_MS });
  return identity;
}
Deno.serve(
  createHandler({
    registry,
    runner,
    storage,
    identify,
    allowedOrigins: (Deno.env.get("ALLOWED_ORIGINS") ?? "*").split(",").map((s) => s.trim())
  })
);
