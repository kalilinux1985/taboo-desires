import { describe, expect, it } from "vitest";
import { sql } from "../core/sql.ts";
import { api } from "./support/api.ts";
import { createTestBackend } from "./support/backend.ts";
import { addMonthsIso, isProActive, nextExpiry } from "../domain/plans.ts";

describe("plan rules", () => {
  const now = Date.parse("2026-01-31T12:00:00.000Z");

  it("clamps month ends", () => {
    expect(addMonthsIso(now, 1)).toBe("2026-02-28T12:00:00.000Z");
  });

  it("stacks renewals on remaining time, otherwise starts now", () => {
    const active = { status: "active", expiresAt: "2026-03-15T00:00:00.000Z" };
    expect(nextExpiry(active, 1, now)).toBe("2026-04-15T00:00:00.000Z");
    const lapsed = { status: "active", expiresAt: "2025-12-01T00:00:00.000Z" };
    expect(nextExpiry(lapsed, 1, now)).toBe("2026-02-28T12:00:00.000Z");
  });

  it("treats expired, declined and unapproved plans as free", () => {
    expect(
      isProActive(
        { status: "active", expiresAt: "2025-01-01T00:00:00.000Z" },
        now,
      ),
    ).toBe(false);
    expect(
      isProActive(
        { status: "declined", expiresAt: "2027-01-01T00:00:00.000Z" },
        now,
      ),
    ).toBe(false);
    expect(isProActive({ status: "pending", expiresAt: "" }, now)).toBe(false);
    // Renewal pending on a still-paid plan stays Pro
    expect(
      isProActive(
        { status: "pending", expiresAt: "2027-01-01T00:00:00.000Z" },
        now,
      ),
    ).toBe(true);
  });
});

async function setup() {
  const t = await createTestBackend();
  const seller = t.withIdentity({
    tokenIdentifier: "test|seller",
    name: "Sam",
  });
  const admin = t.withIdentity({ tokenIdentifier: "test|admin", name: "Ada" });
  const sellerId = await seller.mutation(api.users.updateCurrentUser, {});
  await seller.mutation(api.users.setAccountType, { accountType: "seller" });
  const adminId = await admin.mutation(api.users.updateCurrentUser, {});
  await t.run((ctx) => ctx.db.patch("users", adminId, { role: "admin" }));
  const imageIds = Array.from({ length: 6 }, () => t.storeFile(sellerId));
  const listing = {
    title: "Lace set",
    description: "",
    category: "lingerie" as const,
    brand: "Agent Provocateur",
    size: "S",
    condition: "one_day" as const,
    priceCents: 40_00,
  };
  return { t, seller, admin, imageIds, listing };
}

describe("subscriptions", () => {
  it("blocks a free seller from listing", async () => {
    const { seller, imageIds, listing } = await setup();
    await expect(
      seller.mutation(api.listings.create, {
        ...listing,
        imageIds: imageIds.slice(0, 1),
        saleType: "fixed",
      }),
    ).rejects.toThrow(/Upgrade to Pro to create listings/);
  });

  it("enforces Pro photo and auction limits", async () => {
    const { t, seller, imageIds, listing } = await setup();
    // Admins can list without Pro, but free-plan photo and auction limits still apply
    await t.run(async (ctx) => {
      const s = await ctx.db.first(
        "users",
        sql`where token_identifier = ${"test|seller"}`,
      );
      if (s) await ctx.db.patch("users", s._id, { role: "admin" });
    });
    await expect(
      seller.mutation(api.listings.create, {
        ...listing,
        imageIds: imageIds.slice(0, 1),
        saleType: "auction",
        durationHours: 24,
      }),
    ).rejects.toThrow(/Pro feature/);
    await expect(
      seller.mutation(api.listings.create, {
        ...listing,
        imageIds,
        saleType: "fixed",
      }),
    ).rejects.toThrow(/up to 4 photos/);
  });

  it("unlocks Pro after admin approval and lists the seller as featured", async () => {
    const { seller, admin, imageIds, listing } = await setup();
    await seller.mutation(api.subscriptions.requestPro, {
      note: "Paid by Venmo",
    });
    await expect(
      seller.query(api.subscriptions.adminList, {
        status: "pending",
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).rejects.toThrow(/Admins only/);

    const queue = await admin.query(api.subscriptions.adminList, {
      status: "pending",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(queue.page).toHaveLength(1);
    await admin.mutation(api.subscriptions.approve, {
      subscriptionId: queue.page[0]._id,
      months: 1,
    });

    expect((await seller.query(api.subscriptions.mine, {}))?.plan).toBe("pro");
    await seller.mutation(api.listings.create, {
      ...listing,
      imageIds,
      saleType: "auction",
      durationHours: 24,
    });
    const featured = await seller.query(api.subscriptions.featured, {});
    expect(featured).toHaveLength(1);
    expect(featured[0].sellerIsPro).toBe(true);

    const active = await admin.query(api.subscriptions.adminList, {
      status: "active",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(active.page[0]).toMatchObject({
      isCurrentlyPro: true,
      note: "Paid by Venmo",
    });
  });

  it("drops back to free when an admin revokes Pro", async () => {
    const { seller, admin } = await setup();
    await seller.mutation(api.subscriptions.requestPro, { note: "" });
    const queue = await admin.query(api.subscriptions.adminList, {
      status: "pending",
      paginationOpts: { numItems: 10, cursor: null },
    });
    await admin.mutation(api.subscriptions.approve, {
      subscriptionId: queue.page[0]._id,
      months: 3,
    });
    await admin.mutation(api.subscriptions.revoke, {
      subscriptionId: queue.page[0]._id,
    });
    expect((await seller.query(api.subscriptions.mine, {}))?.plan).toBe("free");
  });
});
