import { describe, expect, it } from "vitest";
import { AppError } from "../core/errors.ts";
import { createHandler } from "../core/http.ts";
import { registry } from "../registry.ts";
import { createTestBackend } from "./support/backend.ts";

async function setup(allowedOrigins = ["*"]) {
  const t = await createTestBackend();
  const handler = createHandler({
    registry,
    runner: t.runner,
    storage: t.files,
    allowedOrigins,
    // Stands in for the Supabase Auth token check
    identify: async (token) => {
      if (!token) return null;
      if (token === "expired")
        throw new AppError({
          code: "UNAUTHENTICATED",
          message: "Session expired",
        });
      return { tokenIdentifier: `test|${token}`, name: token };
    },
  });
  const call = async (
    fn: unknown,
    args: unknown,
    token?: string,
    origin = "https://app.test",
  ) => {
    const res = await handler(
      new Request("https://fn.test/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin,
          ...(token ? { "x-user-token": token } : {}),
        },
        body: JSON.stringify({ fn, args }),
      }),
    );
    return {
      status: res.status,
      cors: res.headers.get("access-control-allow-origin"),
      body: await res.json(),
    };
  };
  return { t, handler, call };
}

describe("api http handler", () => {
  it("runs functions and returns value, reads and writes", async () => {
    const { call } = await setup();
    const created = await call("users.updateCurrentUser", {}, "alice");
    expect(created.status).toBe(200);
    expect(created.body.writes).toEqual(["users"]);
    const menu = await call("users.menu", {}, "alice");
    expect(menu.body.value).toMatchObject({ name: "alice", accountType: null });
    expect(menu.body.reads).toContain("users");
    expect((await call("users.menu", {})).body.value).toBeNull();
  });

  it("maps errors to status codes and safe messages", async () => {
    const { call } = await setup();
    expect(
      await call("forum.createThread", {
        topic: "off_topic",
        title: "Hi",
        body: "x",
      }),
    ).toMatchObject({
      status: 401,
      body: { error: { code: "UNAUTHENTICATED" } },
    });
    expect((await call("users.menu", {}, "expired")).status).toBe(401);
    expect((await call("listings.get", { listingId: "nope" })).status).toBe(
      400,
    );
    expect((await call("auctions.closeDue", {})).status).toBe(404);
    expect((await call(42, {})).status).toBe(400);
  });

  it("answers CORS preflight and restricts origins when configured", async () => {
    const { handler, call } = await setup(["https://shop.example"]);
    const pre = await handler(
      new Request("https://fn.test/api", {
        method: "OPTIONS",
        headers: { origin: "https://shop.example" },
      }),
    );
    expect(pre.status).toBe(200);
    expect(pre.headers.get("access-control-allow-headers")).toContain(
      "x-user-token",
    );
    expect(
      (await call("users.menu", {}, undefined, "https://shop.example")).cors,
    ).toBe("https://shop.example");
    expect(
      (await call("users.menu", {}, undefined, "https://evil.example")).cors,
    ).toBe("https://shop.example");
    expect(
      (await handler(new Request("https://fn.test/api", { method: "GET" })))
        .status,
    ).toBe(405);
  });

  it("rejects bodies that are not JSON", async () => {
    const { handler } = await setup();
    const res = await handler(
      new Request("https://fn.test/api", { method: "POST", body: "{nope" }),
    );
    expect(res.status).toBe(400);
  });
});
