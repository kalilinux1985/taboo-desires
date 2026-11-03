import { describe, expect, it } from "vitest";
import type { Id } from "../core/schema.ts";
import { api } from "./support/api.ts";
import { createTestBackend } from "./support/backend.ts";

async function setup() {
  const t = await createTestBackend();
  const seller = t.withIdentity({
    tokenIdentifier: "test|seller",
    name: "Sam",
  });
  const buyer = t.withIdentity({ tokenIdentifier: "test|buyer", name: "Bea" });
  const other = t.withIdentity({ tokenIdentifier: "test|other", name: "Oz" });
  const sellerId = await seller.mutation(api.users.updateCurrentUser, {});
  await seller.mutation(api.users.setAccountType, { accountType: "seller" });
  const buyerId = await buyer.mutation(api.users.updateCurrentUser, {});
  await buyer.mutation(api.users.setAccountType, { accountType: "buyer" });
  await other.mutation(api.users.updateCurrentUser, {});
  const send = () =>
    buyer.mutation(api.customRequests.create, {
      sellerId,
      category: "panties",
      wearTime: "two_three_days",
      size: "M",
      details: "Cotton, worn to the gym twice",
      budgetCents: 40_00,
    });
  const get = (id: Id<"customRequests">) =>
    t.run((ctx) => ctx.db.get("customRequests", id));
  return { t, seller, buyer, other, sellerId, buyerId, send, get };
}

const page = { numItems: 10, cursor: null };

describe("custom requests", () => {
  it("lets the seller counter and the buyer accept", async () => {
    const { seller, buyer, send, get } = await setup();
    const id = await send();

    const inbox = await seller.query(api.customRequests.list, {
      role: "seller",
      paginationOpts: page,
    });
    expect(inbox.page[0]).toMatchObject({
      myTurn: true,
      offerCents: 40_00,
      other: { name: "Bea" },
    });

    await seller.mutation(api.customRequests.respond, {
      requestId: id,
      action: "counter",
      offerCents: 55_00,
      note: "Gym sessions cost extra",
    });
    // Seller made the latest offer, so it's the buyer's turn now
    await expect(
      seller.mutation(api.customRequests.respond, {
        requestId: id,
        action: "accept",
      }),
    ).rejects.toThrow(/other side/);

    const sent = await buyer.query(api.customRequests.list, {
      role: "buyer",
      paginationOpts: page,
    });
    expect(sent.page[0]).toMatchObject({
      myTurn: true,
      offerCents: 55_00,
      note: "Gym sessions cost extra",
    });

    await buyer.mutation(api.customRequests.respond, {
      requestId: id,
      action: "accept",
    });
    expect(await get(id)).toMatchObject({
      status: "accepted",
      offerCents: 55_00,
    });
    await expect(
      buyer.mutation(api.customRequests.respond, {
        requestId: id,
        action: "cancel",
      }),
    ).rejects.toThrow(/closed/);
  });

  it("blocks the buyer from accepting their own offer and outsiders from acting", async () => {
    const { buyer, other, seller, send, get } = await setup();
    const id = await send();
    await expect(
      buyer.mutation(api.customRequests.respond, {
        requestId: id,
        action: "accept",
      }),
    ).rejects.toThrow(/other side/);
    await expect(
      other.mutation(api.customRequests.respond, {
        requestId: id,
        action: "decline",
      }),
    ).rejects.toThrow(/not found/);
    await expect(
      seller.mutation(api.customRequests.respond, {
        requestId: id,
        action: "cancel",
      }),
    ).rejects.toThrow(/Only the buyer/);
    await buyer.mutation(api.customRequests.respond, {
      requestId: id,
      action: "cancel",
    });
    expect((await get(id))?.status).toBe("cancelled");
  });

  it("validates price and limits open requests per seller", async () => {
    const { seller, sellerId, buyer, send } = await setup();
    await expect(
      buyer.mutation(api.customRequests.create, {
        sellerId,
        category: "socks",
        wearTime: "week",
        size: "8",
        details: "Long hike socks please",
        budgetCents: 50,
      }),
    ).rejects.toThrow(/between \$1/);
    await send();
    await send();
    await send();
    await expect(send()).rejects.toThrow(/already have 3/);
    // Sellers never send requests (not even to themselves)
    await expect(
      seller.mutation(api.customRequests.create, {
        sellerId,
        category: "socks",
        wearTime: "week",
        size: "8",
        details: "Long hike socks please",
        budgetCents: 10_00,
      }),
    ).rejects.toThrow(/Seller accounts can't buy/);
  });

  it("pages through requests newest first without gaps", async () => {
    const { seller, send } = await setup();
    const ids = [await send(), await send(), await send()];
    const first = await seller.query(api.customRequests.list, {
      role: "seller",
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(first.isDone).toBe(false);
    const second = await seller.query(api.customRequests.list, {
      role: "seller",
      paginationOpts: { numItems: 2, cursor: first.continueCursor },
    });
    expect(second.isDone).toBe(true);
    expect([...first.page, ...second.page].map((r) => r._id)).toEqual(
      [...ids].reverse(),
    );
  });
});
