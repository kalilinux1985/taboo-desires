import { describe, expect, it } from "vitest";
import { api } from "./support/api.ts";
import { createTestBackend } from "./support/backend.ts";
import { capabilities } from "../domain/accounts.ts";

describe("account capabilities", () => {
  it("lets buyers post and message but never list", () => {
    expect(capabilities("buyer", false, false)).toEqual({
      post: true,
      message: true,
      list: false,
      buy: true,
    });
  });
  it("requires Pro for sellers and never lets them buy", () => {
    expect(capabilities("seller", false, false)).toEqual({
      post: false,
      message: false,
      list: false,
      buy: false,
    });
    expect(capabilities("seller", true, false)).toEqual({
      post: true,
      message: true,
      list: true,
      buy: false,
    });
  });
  it("blocks members who haven't chosen yet", () => {
    expect(capabilities(undefined, false, false)).toEqual({
      post: false,
      message: false,
      list: false,
      buy: false,
    });
  });
});

async function setup() {
  const t = await createTestBackend();
  const buyer = t.withIdentity({ tokenIdentifier: "test|buyer", name: "Bea" });
  const seller = t.withIdentity({
    tokenIdentifier: "test|seller",
    name: "Sam",
  });
  const buyerId = await buyer.mutation(api.users.updateCurrentUser, {});
  await seller.mutation(api.users.updateCurrentUser, {});
  await buyer.mutation(api.users.setAccountType, { accountType: "buyer" });
  await seller.mutation(api.users.setAccountType, { accountType: "seller" });
  return { t, buyer, seller, buyerId };
}

describe("account types", () => {
  it("blocks free sellers from the community board", async () => {
    const { buyer, seller } = await setup();
    const thread = {
      topic: "introductions" as const,
      title: "Hello all",
      body: "Hi",
    };
    await buyer.mutation(api.forum.createThread, thread);
    await expect(
      seller.mutation(api.forum.createThread, thread),
    ).rejects.toThrow(/Upgrade to Pro/);
  });

  it("lets buyers become sellers but not the reverse", async () => {
    const { buyer, seller } = await setup();
    await expect(
      seller.mutation(api.users.setAccountType, { accountType: "buyer" }),
    ).rejects.toThrow(/can't switch back/);
    await buyer.mutation(api.users.setAccountType, { accountType: "seller" });
    expect((await buyer.query(api.users.myAccess, {}))?.accountType).toBe(
      "seller",
    );
  });

  it("caps profile photos at 5", async () => {
    const { t, buyer, buyerId } = await setup();
    const ids = Array.from({ length: 6 }, () => t.storeFile(buyerId));
    for (const storageId of ids.slice(0, 5))
      await buyer.mutation(api.users.addProfilePhoto, { storageId });
    await expect(
      buyer.mutation(api.users.addProfilePhoto, { storageId: ids[5] }),
    ).rejects.toThrow(/up to 5/);
  });

  it("refuses files uploaded by someone else", async () => {
    const { t, buyer, seller } = await setup();
    const sellerMe = await seller.query(api.users.menu, {});
    const theirs = t.storeFile(sellerMe!._id);
    await expect(
      buyer.mutation(api.users.addProfilePhoto, { storageId: theirs }),
    ).rejects.toThrow(/upload it again/);
  });
});

describe("seller details", () => {
  it("saves listed choices for sellers and shows them on the shop", async () => {
    const { seller } = await setup();
    await seller.mutation(api.users.updateSellerDetails, {
      details: { country: "Canada", ageRange: "30-40", height: `5'6"` },
    });
    const me = await seller.query(api.users.menu, {});
    const profile = await seller.query(api.users.getProfile, {
      userId: me!._id,
    });
    expect(profile?.sellerDetails).toEqual({
      country: "Canada",
      ageRange: "30-40",
      height: `5'6"`,
    });
  });

  it("rejects buyers and made-up values", async () => {
    const { buyer, seller } = await setup();
    await expect(
      buyer.mutation(api.users.updateSellerDetails, {
        details: { country: "Canada" },
      }),
    ).rejects.toThrow(/Only sellers/);
    await expect(
      seller.mutation(api.users.updateSellerDetails, {
        details: { eyeColor: "Purple" },
      }),
    ).rejects.toThrow(/Invalid eye color/);
  });
});

describe("account deletion", () => {
  it("requires typing DELETE", async () => {
    const { buyer } = await setup();
    await expect(
      buyer.mutation(api.accountDeletion.deleteMyAccount, {
        confirmation: "nope",
      }),
    ).rejects.toThrow(/Type DELETE/);
  });

  it("removes the user and their posts, follows and replies", async () => {
    const { t, buyer, seller } = await setup();
    const sellerMe = await seller.query(api.users.menu, {});
    const threadId = await buyer.mutation(api.forum.createThread, {
      topic: "introductions",
      title: "Hello all",
      body: "Hi",
    });
    await buyer.mutation(api.follows.toggle, { sellerId: sellerMe!._id });
    await buyer.mutation(api.accountDeletion.deleteMyAccount, {
      confirmation: "delete",
    });

    expect(await buyer.query(api.users.menu, {})).toBeNull();
    expect(await t.query(api.forum.getThread, { threadId })).toBeNull();
    const profile = await t.query(api.users.getProfile, {
      userId: sellerMe!._id,
    });
    expect(profile?.stats.followerCount).toBe(0);
    const leftovers = await t.run(async (ctx) => ({
      follows: await ctx.db.select("follows"),
      threads: await ctx.db.select("threads"),
    }));
    expect(leftovers).toEqual({ follows: [], threads: [] });
  });

  it("fixes counters on other people's content and deletes uploaded files", async () => {
    const { t, buyer, buyerId } = await setup();
    const poster = t.withIdentity({
      tokenIdentifier: "test|poster",
      name: "Pat",
    });
    await poster.mutation(api.users.updateCurrentUser, {});
    await poster.mutation(api.users.setAccountType, { accountType: "buyer" });
    const postId = await poster.mutation(api.posts.create, {
      body: "Hello",
      imageIds: [],
    });
    const threadId = await poster.mutation(api.forum.createThread, {
      topic: "off_topic",
      title: "Chat",
      body: "Hi",
    });

    await buyer.mutation(api.posts.toggleLike, { postId });
    await buyer.mutation(api.posts.addComment, { postId, body: "Hey" });
    await buyer.mutation(api.forum.reply, { threadId, body: "Hi back" });
    const photo = t.storeFile(buyerId);
    await buyer.mutation(api.users.addProfilePhoto, { storageId: photo });

    await buyer.mutation(api.accountDeletion.deleteMyAccount, {
      confirmation: "DELETE",
    });

    const feed = await poster.query(api.posts.feed, {
      filter: "all",
      sort: "newest",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(feed.page[0]).toMatchObject({ likeCount: 0, commentCount: 0 });
    expect((await t.query(api.forum.getThread, { threadId }))?.replyCount).toBe(
      0,
    );
    expect(t.files.files.has(photo)).toBe(false);
  });
});

describe("signing in with Supabase Auth", () => {
  it("takes over an existing account only when the verified email matches", async () => {
    const t = await createTestBackend();
    // An account from before the switch, keyed by the old sign-in provider
    const oldId = await t.run((ctx) =>
      ctx.db.insert("users", {
        tokenIdentifier: "https://old-provider.example|abc",
        email: "Seller@Example.com",
        shopName: "Old Shop",
        accountType: "seller",
        verified: false,
      }),
    );

    // Unconfirmed email: gets a fresh account, never someone else's
    const unverified = t.withIdentity({
      tokenIdentifier: "supabase|intruder",
      email: "seller@example.com",
      emailVerified: false,
    });
    expect(await unverified.mutation(api.users.updateCurrentUser, {})).not.toBe(
      oldId,
    );

    // Confirmed email: the old account (shop, history) is linked to the new login
    const owner = t.withIdentity({
      tokenIdentifier: "supabase|owner",
      email: "seller@example.com",
      emailVerified: true,
      name: "Sam",
    });
    expect(await owner.mutation(api.users.updateCurrentUser, {})).toBe(oldId);
    expect(await owner.mutation(api.users.updateCurrentUser, {})).toBe(oldId);
    const menu = await owner.query(api.users.menu, {});
    expect(menu).toMatchObject({
      _id: oldId,
      name: "Old Shop",
      accountType: "seller",
    });

    // Once linked, it can't be claimed again by another login with the same email
    const second = t.withIdentity({
      tokenIdentifier: "supabase|other",
      email: "seller@example.com",
      emailVerified: true,
    });
    expect(await second.mutation(api.users.updateCurrentUser, {})).not.toBe(
      oldId,
    );
  });
});
