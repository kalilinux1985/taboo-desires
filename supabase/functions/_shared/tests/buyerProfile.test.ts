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
  await seller.mutation(api.users.updateCurrentUser, {});
  await seller.mutation(api.users.setAccountType, { accountType: "seller" });
  const buyerId = await buyer.mutation(api.users.updateCurrentUser, {});
  await buyer.mutation(api.users.setAccountType, { accountType: "buyer" });
  return { t, seller, buyer, buyerId };
}

describe("buyer profile", () => {
  it("saves valid buyer details and rejects bad ones", async () => {
    const { t, seller, buyer, buyerId } = await setup();
    await buyer.mutation(api.users.updateBuyerDetails, {
      details: {
        gender: "Male",
        ageRange: "30-40",
        lookingFor: ["Instant Vids"],
      },
    });
    const profile = await t.query(api.users.getProfile, { userId: buyerId });
    expect(profile?.buyerDetails).toEqual({
      gender: "Male",
      ageRange: "30-40",
      lookingFor: ["Instant Vids"],
    });
    expect(profile?.badges.map((b) => b.key)).toContain("details");

    await expect(
      buyer.mutation(api.users.updateBuyerDetails, {
        details: { lookingFor: ["Anything"] },
      }),
    ).rejects.toThrow(/looking for/);
    await expect(
      buyer.mutation(api.users.updateBuyerDetails, {
        details: { lookingFor: ["Socks", "Socks"] },
      }),
    ).rejects.toThrow();
    await expect(
      seller.mutation(api.users.updateBuyerDetails, {
        details: { gender: "Male" },
      }),
    ).rejects.toThrow(/Only buyers/);
  });

  it("counts visits from others but not the owner", async () => {
    const { t, seller, buyer, buyerId } = await setup();
    await seller.mutation(api.activity.recordProfileVisit, { userId: buyerId });
    await t.mutation(api.activity.recordProfileVisit, { userId: buyerId });
    await buyer.mutation(api.activity.recordProfileVisit, { userId: buyerId });
    const profile = await t.query(api.users.getProfile, { userId: buyerId });
    expect(profile?.activity.profileVisits).toBe(2);
  });

  it("marks a member online after a heartbeat", async () => {
    const { t, buyer, buyerId } = await setup();
    expect(
      (await t.query(api.users.getProfile, { userId: buyerId }))?.activity
        .lastSeenAt,
    ).toBeNull();
    await buyer.mutation(api.activity.heartbeat, {});
    expect(
      (await t.query(api.users.getProfile, { userId: buyerId }))?.activity
        .lastSeenAt,
    ).toEqual(expect.any(String));
    expect(
      await t.query(api.posts.onlineAuthors, { userIds: [buyerId] }),
    ).toEqual([buyerId]);
  });
});
