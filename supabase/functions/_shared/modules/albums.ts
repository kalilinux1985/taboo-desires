// Photo albums a member sorts their profile photos into.

import { AppError } from "../core/errors.ts";
import { mutation, query } from "../core/functions.ts";
import { sql } from "../core/sql.ts";
import { v } from "../core/values.ts";
import { getCurrentUserDoc, requireUser } from "../lib/auth.ts";

const NAME_MAX = 40;
const ALBUMS_MAX = 50;

/** The signed-in member's albums, oldest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (!me) return [];
    const rows = await ctx.db.select(
      "photoAlbums",
      sql`where user_id = ${me._id}::uuid order by created_at limit ${ALBUMS_MAX}::int`,
    );
    return rows.map((a) => ({ _id: a._id, name: a.name }));
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const me = await requireUser(ctx);
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean || clean.length > NAME_MAX)
      throw new AppError({
        code: "BAD_REQUEST",
        message: `Album names are 1 to ${NAME_MAX} characters`,
      });
    const existing = await ctx.db.select("photoAlbums", sql`where user_id = ${me._id}::uuid limit ${ALBUMS_MAX}::int`);
    if (existing.some((a) => a.name.toLowerCase() === clean.toLowerCase()))
      throw new AppError({ code: "BAD_REQUEST", message: "You already have an album with that name" });
    if (existing.length >= ALBUMS_MAX)
      throw new AppError({ code: "FORBIDDEN", message: `You can have up to ${ALBUMS_MAX} albums` });
    return await ctx.db.insert("photoAlbums", { userId: me._id, name: clean });
  },
});
