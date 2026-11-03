import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "../core/sql.ts";
import { api, internal } from "./support/api.ts";
import { createTestBackend } from "./support/backend.ts";
import {
  ANTI_SNIPE_MS,
  bidIncrementCents,
  extendedEndsAtMs,
  minNextBidCents,
} from "../domain/bidding.ts";

describe("bidding rules", () => {
  it("steps the increment up with price", () => {
    expect(bidIncrementCents(50_00)).toBe(1_00);
    expect(bidIncrementCents(200_00)).toBe(5_00);
    expect(bidIncrementCents(800_00)).toBe(10_00);
    expect(bidIncrementCents(2_000_00)).toBe(25_00);
  });

  it("lets the first bid match the start but later bids must beat it", () => {
    expect(minNextBidCents({ currentBidCents: 100_00, bidCount: 0 })).toBe(
      100_00,
    );
    expect(minNextBidCents({ currentBidCents: 100_00, bidCount: 1 })).toBe(
      105_00,
    );
  });

  it("extends only when a bid lands inside the final window", () => {
    const end = 1_000_000;
    expect(extendedEndsAtMs(end, end - ANTI_SNIPE_MS - 1)).toBe(end);
    expect(extendedEndsAtMs(end, end - 1000)).toBe(end - 1000 + ANTI_SNIPE_MS);
  });
});

async function setup() {
  const t = await createTestBackend();
  const seller = t.withIdentity({
    tokenIdentifier: "test|seller",
    name: "Sam",
  });
  const alice = t.withIdentity({
    tokenIdentifier: "test|alice",
    name: "Alice",
  });
  const bob = t.withIdentity({ tokenIdentifier: "test|bob", name: "Bob" });
  const sellerId = await seller.mutation(api.users.updateCurrentUser, {});
  for (const u of [alice, bob]) {
    await u.mutation(api.users.updateCurrentUser, {});
    await u.mutation(api.users.setAccountType, { accountType: "buyer" });
  }
  await seller.mutation(api.users.setAccountType, { accountType: "seller" });
  // Auctions are a Pro feature
  await t.run((ctx) =>
    ctx.db.insert("subscriptions", {
      userId: sellerId,
      plan: "pro",
      status: "active",
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 3600_000).toISOString(),
    }),
  );

  const imageId = t.storeFile(sellerId);
  const listingId = await seller.mutation(api.listings.create, {
    title: "Black lace thong",
    description: "",
    category: "panties",
    brand: "La Perla",
    size: "M",
    condition: "one_day",
    priceCents: 100_00,
    imageIds: [imageId],
    saleType: "auction",
    durationHours: 1,
  });
  const auction = await t.run((ctx) =>
    ctx.db.first("auctions", sql`where listing_id = ${listingId}::uuid`),
  );
  if (!auction) throw new Error("auction not created");
  return { t, seller, alice, bob, sellerId, listingId, auctionId: auction._id };
}

describe("auctions", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects low bids, self bids, and seller bids", async () => {
    const { seller, alice, auctionId } = await setup();
    await expect(
      alice.mutation(api.auctions.placeBid, { auctionId, amountCents: 99_00 }),
    ).rejects.toThrow(/at least/);
    await expect(
      seller.mutation(api.auctions.placeBid, {
        auctionId,
        amountCents: 150_00,
      }),
    ).rejects.toThrow(/Seller accounts can't buy/);

    await alice.mutation(api.auctions.placeBid, {
      auctionId,
      amountCents: 100_00,
    });
    await expect(
      alice.mutation(api.auctions.placeBid, { auctionId, amountCents: 110_00 }),
    ).rejects.toThrow(/already the highest/);
  });

  it("highest bidder wins when the auction closes", async () => {
    const { t, alice, bob, sellerId, listingId, auctionId } = await setup();
    await alice.mutation(api.auctions.placeBid, {
      auctionId,
      amountCents: 100_00,
    });
    await expect(
      bob.mutation(api.auctions.placeBid, { auctionId, amountCents: 104_00 }),
    ).rejects.toThrow(/at least/);
    await bob.mutation(api.auctions.placeBid, {
      auctionId,
      amountCents: 105_00,
    });

    vi.advanceTimersByTime(60 * 60 * 1000 + 1);
    expect(await t.mutation(internal.auctions.closeDue, {})).toBe(1);

    const state = await bob.query(api.auctions.forListing, { listingId });
    expect(state?.status).toBe("ended");
    expect(state?.iWon).toBe(true);
    expect(state?.currentBidCents).toBe(105_00);
    expect(state?.bids.map((b) => b.bidderLabel)).toEqual(["B***b", "A***e"]);
    const listing = await t.run((ctx) => ctx.db.get("listings", listingId));
    expect(listing?.status).toBe("sold");
    expect(listing?.priceCents).toBe(105_00);
    expect(
      (await t.query(api.users.getProfile, { userId: sellerId }))?.stats
        .salesCount,
    ).toBe(1);
  });

  it("does not close early after a late bid extends the end time", async () => {
    const { t, alice, listingId, auctionId } = await setup();
    vi.advanceTimersByTime(60 * 60 * 1000 - 30_000); // 30s left
    expect(
      (
        await alice.mutation(api.auctions.placeBid, {
          auctionId,
          amountCents: 100_00,
        })
      ).extended,
    ).toBe(true);

    vi.advanceTimersByTime(31_000); // original end has passed
    expect(await t.mutation(internal.auctions.closeDue, {})).toBe(0);
    const state = await alice.query(api.auctions.forListing, { listingId });
    expect(state?.status).toBe("live");
  });

  it("marks the listing unsold when nobody bids, and can be relisted", async () => {
    const { t, seller, listingId } = await setup();
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);
    await t.mutation(internal.auctions.closeDue, {});
    const listing = await t.run((ctx) => ctx.db.get("listings", listingId));
    expect(listing?.status).toBe("ended");

    await seller.mutation(api.auctions.relist, {
      listingId,
      durationHours: 24,
    });
    const state = await t.query(api.auctions.forListing, { listingId });
    expect(state?.status).toBe("live");
    const soon = await t.query(api.auctions.endingSoon, {
      paginationOpts: { numItems: 5, cursor: null },
    });
    expect(soon.page.map((c) => c._id)).toEqual([listingId]);
  });

  it("won't delete an auction that has bids", async () => {
    const { seller, alice, listingId, auctionId } = await setup();
    await alice.mutation(api.auctions.placeBid, {
      auctionId,
      amountCents: 100_00,
    });
    await expect(
      seller.mutation(api.listings.remove, { listingId }),
    ).rejects.toThrow(/already has bids/);
  });
});

describe("browse", () => {
  it("sorts by price, filters, searches and pages", async () => {
    const t = await createTestBackend();
    const seller = t.withIdentity({
      tokenIdentifier: "test|seller",
      name: "Sam",
    });
    const sellerId = await seller.mutation(api.users.updateCurrentUser, {});
    await seller.mutation(api.users.setAccountType, { accountType: "seller" });
    await t.run((ctx) => ctx.db.patch("users", sellerId, { role: "admin" })); // admins may list without Pro
    const make = (
      title: string,
      priceCents: number,
      category: "socks" | "bras",
    ) =>
      seller.mutation(api.listings.create, {
        title,
        description: "",
        category,
        brand: "Brand",
        size: "M",
        condition: "week",
        priceCents,
        imageIds: [t.storeFile(sellerId)],
        saleType: "fixed",
      });
    await make("Gym socks", 15_00, "socks");
    await make("Hiking socks", 25_00, "socks");
    await make("Lace bra", 40_00, "bras");

    const titles = (r: { page: { title: string }[] }) =>
      r.page.map((c) => c.title);
    const all = (cursor: string | null, numItems = 10) => ({
      numItems,
      cursor,
    });
    expect(
      titles(
        await t.query(api.listings.browse, {
          sort: "price_asc",
          paginationOpts: all(null),
        }),
      ),
    ).toEqual(["Gym socks", "Hiking socks", "Lace bra"]);
    const first = await t.query(api.listings.browse, {
      sort: "price_desc",
      paginationOpts: all(null, 2),
    });
    const rest = await t.query(api.listings.browse, {
      sort: "price_desc",
      paginationOpts: all(first.continueCursor, 2),
    });
    expect([...titles(first), ...titles(rest)]).toEqual([
      "Lace bra",
      "Hiking socks",
      "Gym socks",
    ]);
    expect(rest.isDone).toBe(true);
    expect(
      titles(
        await t.query(api.listings.browse, {
          sort: "newest",
          category: "bras",
          paginationOpts: all(null),
        }),
      ),
    ).toEqual(["Lace bra"]);
    expect(
      titles(
        await t.query(api.listings.browse, {
          sort: "newest",
          search: "sock",
          paginationOpts: all(null),
        }),
      ).sort(),
    ).toEqual(["Gym socks", "Hiking socks"]);
    expect(
      titles(
        await t.query(api.listings.browse, {
          sort: "newest",
          search: "hik",
          paginationOpts: all(null),
        }),
      ),
    ).toEqual(["Hiking socks"]);
  });
});
