import { describe, expect, it } from "vitest";
import { api } from "./support/api.ts";
import { createTestBackend } from "./support/backend.ts";

async function setup() {
  const t = await createTestBackend();
  const seller = t.withIdentity({
    tokenIdentifier: "test|seller",
    name: "Sam",
  });
  const buyer = t.withIdentity({ tokenIdentifier: "test|buyer", name: "Bea" });
  const sellerId = await seller.mutation(api.users.updateCurrentUser, {});
  await seller.mutation(api.users.setAccountType, { accountType: "seller" });
  const buyerId = await buyer.mutation(api.users.updateCurrentUser, {});
  await buyer.mutation(api.users.setAccountType, { accountType: "buyer" });
  // A conversation makes the buyer eligible to review
  const startChat = () =>
    t.run(async (ctx) => {
      const storageId = t.storeFile(sellerId, { contentType: "image/jpeg" });
      const listingId = await ctx.db.insert("listings", {
        sellerId,
        title: "Lace set",
        description: "",
        category: "lingerie",
        brand: "Me",
        size: "S",
        condition: "one_day",
        priceCents: 30_00,
        imageIds: [storageId],
        status: "active",
        saleType: "fixed",
      });
      await ctx.db.insert("conversations", {
        listingId,
        buyerId,
        sellerId,
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: "hi",
        lastSenderId: buyerId,
        buyerUnread: false,
        sellerUnread: true,
      });
      return listingId;
    });
  return { t, seller, buyer, sellerId, buyerId, startChat };
}

describe("reviews", () => {
  it("require a prior conversation or purchase", async () => {
    const { buyer, sellerId } = await setup();
    expect(
      (await buyer.query(api.reviews.myReview, { sellerId }))?.eligible,
    ).toBe(false);
    await expect(
      buyer.mutation(api.reviews.save, { sellerId, rating: 5, body: "" }),
    ).rejects.toThrow(/after messaging/);
  });

  it("keep the average correct across create, edit and delete", async () => {
    const { buyer, seller, sellerId, startChat } = await setup();
    await startChat();
    await buyer.mutation(api.reviews.save, {
      sellerId,
      rating: 4,
      body: "Great",
    });
    let profile = await buyer.query(api.users.getProfile, { userId: sellerId });
    expect(profile?.stats).toMatchObject({ reviewCount: 1, rating: 4 });

    // Editing replaces the rating instead of adding a second review
    await buyer.mutation(api.reviews.save, {
      sellerId,
      rating: 2,
      body: "Meh",
    });
    profile = await buyer.query(api.users.getProfile, { userId: sellerId });
    expect(profile?.stats).toMatchObject({ reviewCount: 1, rating: 2 });

    await expect(
      seller.mutation(api.reviews.save, { sellerId, rating: 5, body: "Me!" }),
    ).rejects.toThrow();
    await expect(
      buyer.mutation(api.reviews.save, { sellerId, rating: 6, body: "" }),
    ).rejects.toThrow(/1 to 5/);

    await buyer.mutation(api.reviews.remove, { sellerId });
    profile = await buyer.query(api.users.getProfile, { userId: sellerId });
    expect(profile?.stats).toMatchObject({ reviewCount: 0, rating: null });
  });
});

describe("follows", () => {
  it("toggle, count followers, and feed the seller's active listings", async () => {
    const { buyer, seller, sellerId, buyerId, startChat } = await setup();
    const listingId = await startChat();
    expect((await buyer.query(api.follows.feed, {})).followingCount).toBe(0);

    expect(await buyer.mutation(api.follows.toggle, { sellerId })).toBe(true);
    expect(await buyer.query(api.follows.isFollowing, { sellerId })).toBe(true);
    const feed = await buyer.query(api.follows.feed, {});
    expect(feed.listings.map((l) => l._id)).toEqual([listingId]);
    expect(
      (await buyer.query(api.users.getProfile, { userId: sellerId }))?.stats
        .followerCount,
    ).toBe(1);

    expect(await buyer.mutation(api.follows.toggle, { sellerId })).toBe(false);
    expect(
      (await buyer.query(api.users.getProfile, { userId: sellerId }))?.stats
        .followerCount,
    ).toBe(0);

    await expect(
      seller.mutation(api.follows.toggle, { sellerId }),
    ).rejects.toThrow(/yourself/);
    await expect(
      seller.mutation(api.follows.toggle, { sellerId: buyerId }),
    ).rejects.toThrow(/not found/);
  });
});

describe("messages", () => {
  it("start, reply, track unread and keep the chat when the listing is deleted", async () => {
    const { t, buyer, seller, sellerId, startChat } = await setup();
    const listingId = await startChat();
    // Sellers need Pro to message
    await t.run((ctx) =>
      ctx.db.insert("subscriptions", {
        userId: sellerId,
        plan: "pro",
        status: "active",
        requestedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    );
    const convoId = await buyer.mutation(api.messages.start, {
      listingId,
      body: "Still available?",
    });
    expect(await seller.query(api.messages.unreadCount, {})).toBe(1);
    await seller.mutation(api.messages.send, {
      conversationId: convoId,
      body: "Yes!",
    });
    expect(await seller.query(api.messages.unreadCount, {})).toBe(0);
    expect(await buyer.query(api.messages.unreadCount, {})).toBe(1);

    const msgs = await buyer.query(api.messages.listMessages, {
      conversationId: convoId,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(msgs.page.map((m) => m.body)).toEqual(["Yes!", "Still available?"]);

    const outsider = t.withIdentity({ tokenIdentifier: "test|outsider" });
    await outsider.mutation(api.users.updateCurrentUser, {});
    await expect(
      outsider.query(api.messages.getConversation, { conversationId: convoId }),
    ).rejects.toThrow(/Not your conversation/);

    await seller.mutation(api.listings.remove, { listingId });
    const inbox = await buyer.query(api.messages.inbox, {});
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({
      listing: null,
      lastMessagePreview: "Yes!",
      unread: true,
    });
  });
});
