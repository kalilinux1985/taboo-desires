import { describe, expect, it } from "vitest";
import { api } from "./support/api.ts";
import { createTestBackend } from "./support/backend.ts";

async function setup() {
  const t = await createTestBackend();
  const alice = t.withIdentity({
    tokenIdentifier: "test|alice",
    name: "Alice",
  });
  const bob = t.withIdentity({ tokenIdentifier: "test|bob", name: "Bob" });
  const admin = t.withIdentity({ tokenIdentifier: "test|admin", name: "Ada" });
  await alice.mutation(api.users.updateCurrentUser, {});
  await bob.mutation(api.users.updateCurrentUser, {});
  await alice.mutation(api.users.setAccountType, { accountType: "buyer" });
  await bob.mutation(api.users.setAccountType, { accountType: "buyer" });
  const adminId = await admin.mutation(api.users.updateCurrentUser, {});
  await t.run((ctx) => ctx.db.patch("users", adminId, { role: "admin" }));
  const threadId = await alice.mutation(api.forum.createThread, {
    topic: "seller_tips",
    title: "Shipping tips",
    body: "How do you pack orders?",
  });
  return { t, alice, bob, admin, threadId };
}

describe("forum", () => {
  it("rejects signed-out posts and empty titles", async () => {
    const { t, alice } = await setup();
    await expect(
      t.mutation(api.forum.createThread, {
        topic: "off_topic",
        title: "Hello",
        body: "Hi",
      }),
    ).rejects.toThrow(/sign in/);
    await expect(
      alice.mutation(api.forum.createThread, {
        topic: "off_topic",
        title: "  ",
        body: "Hi",
      }),
    ).rejects.toThrow(/Title/);
  });

  it("keeps the reply count in sync and filters by topic", async () => {
    const { t, alice, bob, threadId } = await setup();
    const replyId = await bob.mutation(api.forum.reply, {
      threadId,
      body: "Discreet mailers",
    });
    await alice.mutation(api.forum.reply, { threadId, body: "Thanks!" });
    expect((await t.query(api.forum.getThread, { threadId }))?.replyCount).toBe(
      2,
    );

    // Only the author (or an admin) can delete a reply
    await expect(
      alice.mutation(api.forum.deleteReply, { replyId }),
    ).rejects.toThrow(/can't delete/);
    await bob.mutation(api.forum.deleteReply, { replyId });
    expect((await t.query(api.forum.getThread, { threadId }))?.replyCount).toBe(
      1,
    );

    const opts = { numItems: 10, cursor: null };
    expect(
      (
        await t.query(api.forum.listThreads, {
          topic: "seller_tips",
          paginationOpts: opts,
        })
      ).page,
    ).toHaveLength(1);
    expect(
      (
        await t.query(api.forum.listThreads, {
          topic: "buyer_talk",
          paginationOpts: opts,
        })
      ).page,
    ).toHaveLength(0);
  });

  it("lets admins remove any discussion and its replies", async () => {
    const { t, bob, admin, threadId } = await setup();
    await bob.mutation(api.forum.reply, { threadId, body: "Nice" });
    await expect(
      bob.mutation(api.forum.deleteThread, { threadId }),
    ).rejects.toThrow(/can't delete/);
    await admin.mutation(api.forum.deleteThread, { threadId });
    expect(await t.query(api.forum.getThread, { threadId })).toBeNull();
    const left = await t.run((ctx) => ctx.db.select("replies"));
    expect(left).toHaveLength(0);
  });

  it("returns null for a malformed thread link", async () => {
    const { t } = await setup();
    expect(
      await t.query(api.forum.getThread, { threadId: "not-an-id" }),
    ).toBeNull();
  });

  it("rejects malformed ids and unknown arguments", async () => {
    const { t, alice } = await setup();
    await expect(
      alice.mutation(api.forum.reply, {
        threadId: "nope" as never,
        body: "Hi",
      }),
    ).rejects.toThrow(/threads id/);
    await expect(
      t.query(api.forum.getThread, { threadId: "x", extra: 1 } as never),
    ).rejects.toThrow(/no such field/);
  });
});
