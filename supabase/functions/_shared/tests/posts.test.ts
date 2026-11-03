import { describe, expect, it } from "vitest";
import { api } from "./support/api.ts";
import { createTestBackend } from "./support/backend.ts";

const page = { numItems: 20, cursor: null };

async function setup() {
  const t = await createTestBackend();
  const alice = t.withIdentity({
    tokenIdentifier: "test|alice",
    name: "Alice",
  });
  const bob = t.withIdentity({ tokenIdentifier: "test|bob", name: "Bob" });
  const seller = t.withIdentity({
    tokenIdentifier: "test|seller",
    name: "Sam",
  });
  const aliceId = await alice.mutation(api.users.updateCurrentUser, {});
  await alice.mutation(api.users.setAccountType, { accountType: "buyer" });
  await bob.mutation(api.users.updateCurrentUser, {});
  await bob.mutation(api.users.setAccountType, { accountType: "buyer" });
  await seller.mutation(api.users.updateCurrentUser, {});
  await seller.mutation(api.users.setAccountType, { accountType: "seller" });
  return { t, alice, bob, seller, aliceId };
}

describe("activity feed", () => {
  it("blocks empty and signed-out posts and free sellers", async () => {
    const { t, alice, seller } = await setup();
    await expect(
      alice.mutation(api.posts.create, { body: "   ", imageIds: [] }),
    ).rejects.toThrow(/empty/);
    await expect(
      t.mutation(api.posts.create, { body: "Hi", imageIds: [] }),
    ).rejects.toThrow(/sign in/);
    await expect(
      seller.mutation(api.posts.create, { body: "Hi", imageIds: [] }),
    ).rejects.toThrow(/Pro/);
  });

  it("keeps like and comment counts in sync and filters by kind", async () => {
    const { t, alice, bob, aliceId } = await setup();
    const textId = await alice.mutation(api.posts.create, {
      body: "Hello all",
      imageIds: [],
    });
    const imageId = t.storeFile(aliceId);
    await alice.mutation(api.posts.create, { body: "", imageIds: [imageId] });

    expect(await bob.mutation(api.posts.toggleLike, { postId: textId })).toBe(
      true,
    );
    await alice.mutation(api.posts.toggleLike, { postId: textId });
    const commentId = await bob.mutation(api.posts.addComment, {
      postId: textId,
      body: "Welcome!",
    });

    const all = await bob.query(api.posts.feed, {
      filter: "all",
      sort: "newest",
      paginationOpts: page,
    });
    expect(all.page).toHaveLength(2);
    const text = all.page.find((p) => p._id === textId);
    expect(text).toMatchObject({
      likeCount: 2,
      commentCount: 1,
      likedByMe: true,
      canDelete: false,
    });

    const photos = await bob.query(api.posts.feed, {
      filter: "photo",
      sort: "newest",
      paginationOpts: page,
    });
    expect(photos.page.map((p) => p.kind)).toEqual(["photo"]);
    expect(photos.page[0].images).toHaveLength(1);
    const popular = await bob.query(api.posts.feed, {
      filter: "all",
      sort: "popular",
      paginationOpts: page,
    });
    expect(popular.page[0]._id).toBe(textId);

    await expect(
      alice.mutation(api.posts.removeComment, { commentId }),
    ).rejects.toThrow(/Not your/);
    await bob.mutation(api.posts.removeComment, { commentId });
    expect(await bob.mutation(api.posts.toggleLike, { postId: textId })).toBe(
      false,
    );
    const after = await bob.query(api.posts.feed, {
      filter: "status",
      sort: "newest",
      paginationOpts: page,
    });
    expect(after.page[0]).toMatchObject({
      likeCount: 1,
      commentCount: 0,
      likedByMe: false,
    });
  });

  it("only lets the author delete a post, and deletes its photos", async () => {
    const { t, alice, bob, aliceId } = await setup();
    const imageId = t.storeFile(aliceId);
    const postId = await alice.mutation(api.posts.create, {
      body: "Mine",
      imageIds: [imageId],
    });
    await expect(bob.mutation(api.posts.remove, { postId })).rejects.toThrow(
      /Not your/,
    );
    await alice.mutation(api.posts.remove, { postId });
    const feed = await alice.query(api.posts.feed, {
      filter: "all",
      sort: "newest",
      paginationOpts: page,
    });
    expect(feed.page).toHaveLength(0);
    expect(t.files.files.has(imageId)).toBe(false);
  });
});
