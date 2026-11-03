import { describe, expect, it } from "vitest";
import { activityVerb, shortAge } from "./feed.ts";

describe("shortAge", () => {
  const now = 1_000_000_000_000;
  it("picks the largest whole unit", () => {
    expect(shortAge(now - 4_000, now)).toBe("4s");
    expect(shortAge(now - 12 * 60_000, now)).toBe("12m");
    expect(shortAge(now - 3 * 3_600_000, now)).toBe("3h");
    expect(shortAge(now - 2 * 86_400_000, now)).toBe("2d");
    expect(shortAge(now - 15 * 86_400_000, now)).toBe("2w");
  });
  it("never goes negative for clock skew", () => {
    expect(shortAge(now + 5_000, now)).toBe("0s");
  });
});

describe("activityVerb", () => {
  it("describes each kind of post", () => {
    expect(activityVerb({ kind: "photo", repost: false, images: ["a"] })).toEqual({ lead: "Added", link: "a new photo" });
    expect(activityVerb({ kind: "photo", repost: false, images: ["a", "b"] }).link).toBe("new photos");
    expect(activityVerb({ kind: "listing", repost: true, images: [] })).toEqual({ lead: "Reposted", link: "a listing" });
    expect(activityVerb({ kind: "listing", repost: false, images: [] }).lead).toBe("Listed");
  });
});
