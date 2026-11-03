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
  const admin = t.withIdentity({ tokenIdentifier: "test|admin", name: "Ada" });
  const sellerId = await seller.mutation(api.users.updateCurrentUser, {});
  await seller.mutation(api.users.setAccountType, { accountType: "seller" });
  const buyerId = await buyer.mutation(api.users.updateCurrentUser, {});
  await buyer.mutation(api.users.setAccountType, { accountType: "buyer" });
  const adminId = await admin.mutation(api.users.updateCurrentUser, {});
  await t.run((ctx) => ctx.db.patch("users", adminId, { role: "admin" }));
  const photo = (ownerId = sellerId) =>
    t.storeFile(ownerId, { contentType: "image/jpeg", visibility: "private" });
  const listing = () =>
    t.run(async (ctx) =>
      ctx.db.insert("listings", {
        sellerId,
        title: "Lace set",
        description: "",
        category: "lingerie",
        brand: "Me",
        size: "S",
        condition: "one_day",
        priceCents: 30_00,
        imageIds: [t.storeFile(sellerId, { contentType: "image/jpeg" })],
        status: "active",
        saleType: "fixed",
      }),
    );
  return { t, seller, buyer, admin, sellerId, buyerId, photo, listing };
}

describe("seller verification", () => {
  it("is admin-approved and deletes the private photo", async () => {
    const { t, seller, buyer, admin, sellerId, buyerId, photo } = await setup();
    await expect(
      buyer.mutation(api.verification.submit, {
        photoStorageId: photo(buyerId),
      }),
    ).rejects.toThrow(/seller accounts/);

    const storageId = photo();
    await seller.mutation(api.verification.submit, {
      photoStorageId: storageId,
    });
    expect((await seller.query(api.verification.mine, {}))?.status).toBe(
      "pending",
    );
    await expect(
      seller.query(api.verification.adminPending, {
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).rejects.toThrow(/Admins only/);

    const queue = await admin.query(api.verification.adminPending, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(queue.page).toHaveLength(1);
    expect(queue.page[0].photoUrl).toContain("/signed/");
    await expect(
      seller.mutation(api.verification.review, {
        verificationId: queue.page[0]._id,
        approve: true,
      }),
    ).rejects.toThrow(/Admins only/);
    await admin.mutation(api.verification.review, {
      verificationId: queue.page[0]._id,
      approve: true,
    });

    expect(
      (await buyer.query(api.users.getProfile, { userId: sellerId }))?.verified,
    ).toBe(true);
    expect(await t.run((ctx) => ctx.storage.getUrl(storageId))).toBeNull();
  });

  it("only accepts the seller's own private upload", async () => {
    const { t, seller, sellerId } = await setup();
    const publicPhoto = t.storeFile(sellerId, { contentType: "image/jpeg" });
    await expect(
      seller.mutation(api.verification.submit, { photoStorageId: publicPhoto }),
    ).rejects.toThrow(/not found/);
  });
});

describe("favorites", () => {
  it("toggle, list, and are removed with the listing", async () => {
    const { seller, buyer, listing } = await setup();
    const listingId = await listing();
    await expect(
      seller.mutation(api.favorites.toggle, { listingId }),
    ).rejects.toThrow(/own listing/);

    expect(await buyer.mutation(api.favorites.toggle, { listingId })).toBe(
      true,
    );
    expect(await buyer.query(api.favorites.isFavorite, { listingId })).toBe(
      true,
    );
    const saved = await buyer.query(api.favorites.mine, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(saved.page.map((l) => l._id)).toEqual([listingId]);

    await seller.mutation(api.listings.remove, { listingId });
    const after = await buyer.query(api.favorites.mine, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(after.page).toHaveLength(0);
  });
});

describe("sales count", () => {
  it("follows the sold flag", async () => {
    const { seller, buyer, sellerId, listing } = await setup();
    const listingId = await listing();
    const sales = async () =>
      (await buyer.query(api.users.getProfile, { userId: sellerId }))?.stats
        .salesCount;

    await seller.mutation(api.listings.setStatus, {
      listingId,
      status: "sold",
    });
    // Marking sold twice doesn't double count
    await seller.mutation(api.listings.setStatus, {
      listingId,
      status: "sold",
    });
    expect(await sales()).toBe(1);
    await seller.mutation(api.listings.setStatus, {
      listingId,
      status: "active",
    });
    expect(await sales()).toBe(0);
  });
});
