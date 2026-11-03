import { describe, expect, it } from "vitest";
import { api } from "./support/api.ts";
import { createTestBackend } from "./support/backend.ts";

describe("function runner", () => {
  it("reports tables read and changed, including cascades", async () => {
    const t = await createTestBackend();
    const alice = { tokenIdentifier: "test|alice", name: "Alice" };
    await t.execute("users.updateCurrentUser", {}, { identity: alice });
    await t.execute(
      "users.setAccountType",
      { accountType: "buyer" },
      { identity: alice },
    );
    const { value: threadId } = await t.execute(
      "forum.createThread",
      { topic: "off_topic", title: "Hello", body: "Hi" },
      { identity: alice },
    );
    await t.execute(
      "forum.reply",
      { threadId, body: "First" },
      { identity: alice },
    );

    const read = await t.execute("forum.listReplies", {
      threadId,
      paginationOpts: { numItems: 5, cursor: null },
    });
    expect(read.reads.sort()).toEqual(["replies", "users"]);
    expect(read.writes).toEqual([]);

    const del = await t.execute(
      "forum.deleteThread",
      { threadId },
      { identity: alice },
    );
    expect(del.writes.sort()).toEqual(["replies", "threads"]);

    // No write, no change notification
    const again = await t.execute(
      "users.updateCurrentUser",
      {},
      { identity: alice },
    );
    expect(again.writes).toEqual([]);
  });

  it("never runs internal functions for browser calls", async () => {
    const t = await createTestBackend();
    await expect(t.execute("auctions.closeDue", {})).rejects.toThrow(
      /Unknown function/,
    );
    expect(
      (await t.execute("auctions.closeDue", {}, { allowInternal: true })).value,
    ).toBe(0);
    await expect(t.execute("users.__proto__", {})).rejects.toThrow(
      /Unknown function/,
    );
    await expect(t.execute("nope", {})).rejects.toThrow(/Unknown function/);
  });

  it("validates arguments before running", async () => {
    const t = await createTestBackend();
    await expect(
      t.query(api.listings.get, { listingId: "123" as never }),
    ).rejects.toThrow(/listings id/);
    await expect(
      t.query(api.listings.browse, {
        sort: "cheapest" as never,
        paginationOpts: { numItems: 5, cursor: null },
      }),
    ).rejects.toThrow(/sort/);
  });
});
