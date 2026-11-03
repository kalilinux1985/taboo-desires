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
  await buyer.mutation(api.users.updateCurrentUser, {});
  await buyer.mutation(api.users.setAccountType, { accountType: "buyer" });
  const makePro = () =>
    t.run((ctx) =>
      ctx.db.insert("subscriptions", {
        userId: sellerId,
        plan: "pro",
        status: "active",
        requestedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    );
  // Locked originals are private uploads; their blurred previews are public
  const original = t.storeFile(sellerId, {
    contentType: "image/png",
    visibility: "private",
  });
  const video = t.storeFile(sellerId, {
    contentType: "video/mp4",
    visibility: "private",
  });
  const preview1 = t.storeFile(sellerId, { contentType: "image/jpeg" });
  const preview2 = t.storeFile(sellerId, { contentType: "image/jpeg" });
  const listing = {
    title: "Private set",
    description: "",
    category: "custom" as const,
    brand: "Me",
    size: "One size",
    condition: "custom_wear" as const,
    priceCents: 25_00,
    saleType: "fixed" as const,
    imageIds: [preview1, preview2],
    locked: [
      { storageId: original, kind: "image" as const },
      { storageId: video, kind: "video" as const },
    ],
  };
  return { t, seller, buyer, sellerId, makePro, listing };
}

describe("paywalled listings", () => {
  it("are Pro only", async () => {
    const { seller, listing } = await setup();
    await expect(seller.mutation(api.listings.create, listing)).rejects.toThrow(
      /Upgrade to Pro/,
    );
  });

  it("needs one preview per locked file", async () => {
    const { seller, makePro, listing } = await setup();
    await makePro();
    await expect(
      seller.mutation(api.listings.create, {
        ...listing,
        imageIds: listing.imageIds.slice(0, 1),
      }),
    ).rejects.toThrow(/blurred preview/);
  });

  it("refuses locked originals uploaded to the public bucket or with the wrong type", async () => {
    const { t, seller, sellerId, makePro, listing } = await setup();
    await makePro();
    const publicOriginal = t.storeFile(sellerId, { contentType: "image/png" });
    await expect(
      seller.mutation(api.listings.create, {
        ...listing,
        locked: [
          listing.locked[0],
          { storageId: publicOriginal, kind: "image" },
        ],
      }),
    ).rejects.toThrow(/upload it again/);
    const notVideo = t.storeFile(sellerId, {
      contentType: "image/png",
      visibility: "private",
    });
    await expect(
      seller.mutation(api.listings.create, {
        ...listing,
        locked: [listing.locked[0], { storageId: notVideo, kind: "video" }],
      }),
    ).rejects.toThrow(/Unsupported file type/);
  });

  it("hides originals until the seller grants access", async () => {
    const { seller, buyer, makePro, listing } = await setup();
    await makePro();
    const listingId = await seller.mutation(api.listings.create, listing);

    const before = await buyer.query(api.listings.get, { listingId });
    expect(before?.locked?.media).toBeNull();
    expect(before?.locked?.photoCount).toBe(1);
    expect(before?.locked?.videoCount).toBe(1);
    expect(before && "paywall" in before).toBe(false);

    const own = await seller.query(api.listings.get, { listingId });
    expect(own?.locked?.media).toHaveLength(2);
    expect(own?.locked?.media?.[0].url).toContain("/signed/");

    await buyer.mutation(api.unlocks.request, { listingId });
    expect(
      (await buyer.query(api.listings.get, { listingId }))?.locked
        ?.unlockStatus,
    ).toBe("pending");
    // Another buyer can't approve themselves; only the seller sees the queue
    expect(
      await buyer.query(api.unlocks.pendingForListing, { listingId }),
    ).toHaveLength(0);
    const queue = await seller.query(api.unlocks.pendingForListing, {
      listingId,
    });
    expect(queue).toHaveLength(1);
    await expect(
      buyer.mutation(api.unlocks.respond, {
        unlockId: queue[0]._id,
        grant: true,
      }),
    ).rejects.toThrow(/Not your listing/);

    await seller.mutation(api.unlocks.respond, {
      unlockId: queue[0]._id,
      grant: true,
    });
    const after = await buyer.query(api.listings.get, { listingId });
    expect(after?.locked?.media).toHaveLength(2);
  });
});
