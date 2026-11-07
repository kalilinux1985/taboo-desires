import { AppError } from "../core/errors.ts";
import { acceptsNewMessages } from "../domain/sellerSettings.ts";
import { mutation, query, type MutationCtx, type QueryCtx } from "../core/functions.ts";
import type { Doc, Id } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { paginationOptsValidator, v } from "../core/values.ts";
import {
  getCurrentUserDoc,
  publicSellerName,
  requireUser,
} from "../lib/auth.ts";
import { requireCapability } from "../lib/access.ts";

const MAX_BODY = 2000;
const INBOX_LIMIT = 50;

function cleanBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed)
    throw new AppError({ code: "BAD_REQUEST", message: "Message is empty" });
  if (trimmed.length > MAX_BODY)
    throw new AppError({ code: "BAD_REQUEST", message: "Message is too long" });
  return trimmed;
}

/** Loads a conversation and verifies the caller is the buyer or seller in it. */
async function requireParticipant(
  ctx: QueryCtx,
  conversationId: Id<"conversations">,
) {
  const user = await requireUser(ctx);
  const convo = await ctx.db.get("conversations", conversationId);
  if (!convo)
    throw new AppError({
      code: "NOT_FOUND",
      message: "Conversation not found",
    });
  if (convo.buyerId !== user._id && convo.sellerId !== user._id)
    throw new AppError({ code: "FORBIDDEN", message: "Not your conversation" });
  return { user, convo, isBuyer: convo.buyerId === user._id };
}

async function appendMessage(
  ctx: QueryCtx,
  convo: Doc<"conversations">,
  senderId: Id<"users">,
  body: string,
) {
  await ctx.db.insert("messages", {
    conversationId: convo._id,
    senderId,
    body,
  });
  const senderIsBuyer = senderId === convo.buyerId;
  await ctx.db.patch("conversations", convo._id, {
    lastMessageAt: new Date(ctx.now()).toISOString(),
    lastMessagePreview: body.slice(0, 120),
    lastSenderId: senderId,
    buyerUnread: !senderIsBuyer,
    sellerUnread: senderIsBuyer,
  });
}

async function summarize(
  ctx: QueryCtx,
  convo: Doc<"conversations">,
  me: Id<"users">,
) {
  const isBuyer = convo.buyerId === me;
  const [listing, other] = await Promise.all([
    convo.listingId ? ctx.db.get("listings", convo.listingId) : null,
    ctx.db.get("users", isBuyer ? convo.sellerId : convo.buyerId),
  ]);
  const imageUrl = listing?.imageIds[0]
    ? await ctx.storage.getUrl(listing.imageIds[0])
    : null;
  return {
    _id: convo._id,
    role: isBuyer ? ("buyer" as const) : ("seller" as const),
    lastMessageAt: convo.lastMessageAt,
    lastMessagePreview: convo.lastMessagePreview,
    lastFromMe: convo.lastSenderId === me,
    unread: isBuyer ? convo.buyerUnread : convo.sellerUnread,
    other: {
      _id: other?._id ?? null,
      name: other ? publicSellerName(other) : "Deleted user",
    },
    listing: listing
      ? {
          _id: listing._id,
          title: listing.title,
          priceCents: listing.priceCents,
          status: listing.status,
          imageUrl,
        }
      : null,
  };
}

/** Starts (or continues) a conversation with the seller of a listing. */
/** Sellers can turn off new conversations; buyers already talking to them can still write. */
async function assertSellerAcceptsBuyer(
  ctx: MutationCtx,
  sellerId: Id<"users">,
  buyerId: Id<"users">,
) {
  const seller = await ctx.db.get("users", sellerId);
  if (acceptsNewMessages(seller?.settings)) return;
  const talking = await ctx.db.first(
    "conversations",
    sql`where seller_id = ${sellerId}::uuid and buyer_id = ${buyerId}::uuid`,
  );
  if (!talking)
    throw new AppError({
      code: "FORBIDDEN",
      message: "This seller isn't accepting new messages right now",
    });
}

export const start = mutation({
  args: { listingId: v.id("listings"), body: v.string() },
  handler: async (ctx, { listingId, body }) => {
    // Starting a conversation about a listing is shopping; sellers only reply
    await requireCapability(ctx, "message");
    const user = await requireCapability(ctx, "buy");
    const text = cleanBody(body);
    const listing = await ctx.db.get("listings", listingId);
    if (!listing)
      throw new AppError({ code: "NOT_FOUND", message: "Listing not found" });
    if (listing.sellerId === user._id)
      throw new AppError({
        code: "BAD_REQUEST",
        message: "This is your own listing",
      });

    const existing = await ctx.db.first(
      "conversations",
      sql`where listing_id = ${listingId}::uuid and buyer_id = ${user._id}::uuid`,
    );
    if (!existing) await assertSellerAcceptsBuyer(ctx, listing.sellerId, user._id);
    const convo =
      existing ??
      (await ctx.db.get(
        "conversations",
        await ctx.db.insert("conversations", {
          listingId,
          buyerId: user._id,
          sellerId: listing.sellerId,
          lastMessageAt: new Date(ctx.now()).toISOString(),
          lastMessagePreview: "",
          lastSenderId: user._id,
          buyerUnread: false,
          sellerUnread: true,
        }),
      ));
    if (!convo)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Conversation missing",
      });

    await appendMessage(ctx, convo, user._id, text);
    return convo._id;
  },
});

/** Message a seller from their profile: one direct conversation per buyer and seller. */
export const startWithSeller = mutation({
  args: { sellerId: v.id("users"), body: v.string() },
  handler: async (ctx, { sellerId, body }) => {
    await requireCapability(ctx, "message");
    const user = await requireCapability(ctx, "buy");
    const text = cleanBody(body);
    if (sellerId === user._id)
      throw new AppError({ code: "BAD_REQUEST", message: "This is your own profile" });
    const seller = await ctx.db.get("users", sellerId);
    if (!seller || seller.accountType !== "seller")
      throw new AppError({ code: "NOT_FOUND", message: "Seller not found" });

    const existing = await ctx.db.first(
      "conversations",
      sql`where listing_id is null and buyer_id = ${user._id}::uuid and seller_id = ${sellerId}::uuid`,
    );
    if (!existing) await assertSellerAcceptsBuyer(ctx, sellerId, user._id);
    const convo =
      existing ??
      (await ctx.db.get(
        "conversations",
        await ctx.db.insert("conversations", {
          buyerId: user._id,
          sellerId,
          lastMessageAt: new Date(ctx.now()).toISOString(),
          lastMessagePreview: "",
          lastSenderId: user._id,
          buyerUnread: false,
          sellerUnread: true,
        }),
      ));
    if (!convo)
      throw new AppError({ code: "NOT_FOUND", message: "Conversation missing" });
    await appendMessage(ctx, convo, user._id, text);
    return convo._id;
  },
});

export const send = mutation({
  args: { conversationId: v.id("conversations"), body: v.string() },
  handler: async (ctx, { conversationId, body }) => {
    await requireCapability(ctx, "message");
    const { user, convo } = await requireParticipant(ctx, conversationId);
    await appendMessage(ctx, convo, user._id, cleanBody(body));
    return null;
  },
});

export const markRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const { convo, isBuyer } = await requireParticipant(ctx, conversationId);
    // Skip the write when already read to avoid needless refreshes
    if (isBuyer && convo.buyerUnread)
      await ctx.db.patch("conversations", conversationId, {
        buyerUnread: false,
      });
    if (!isBuyer && convo.sellerUnread)
      await ctx.db.patch("conversations", conversationId, {
        sellerUnread: false,
      });
    return null;
  },
});

/** Most recent conversations where the user is buyer or seller. */
export const inbox = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return [];
    const convos = await ctx.db.select(
      "conversations",
      sql`where buyer_id = ${me._id}::uuid or seller_id = ${me._id}::uuid
          order by last_message_at desc, id desc limit ${INBOX_LIMIT}`,
    );
    return await Promise.all(convos.map((c) => summarize(ctx, c, me._id)));
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return 0;
    ctx.db.touch("conversations");
    // Capped count is enough for a header badge ("9+")
    const n = await ctx.db.scalar(sql`
      select (
        (select count(*) from (select 1 from public.conversations
          where buyer_id = ${me._id}::uuid and buyer_unread limit 10) b)
        + (select count(*) from (select 1 from public.conversations
          where seller_id = ${me._id}::uuid and seller_unread limit 10) s)
      )::int`);
    return Number(n);
  },
});

export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const { user, convo } = await requireParticipant(ctx, conversationId);
    return { ...(await summarize(ctx, convo, user._id)), meId: user._id };
  },
});

export const listMessages = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { conversationId, paginationOpts }) => {
    await requireParticipant(ctx, conversationId);
    return await ctx.db.paginate(
      "messages",
      {
        where: sql`conversation_id = ${conversationId}::uuid`,
        order: [{ column: "created_at", cast: "timestamptz" }],
        direction: "desc",
      },
      paginationOpts,
    );
  },
});
