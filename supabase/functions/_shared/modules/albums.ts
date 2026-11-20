// Photo albums a member sorts their profile photos into.

import { AppError } from "../core/errors.ts";
import { mutation, query } from "../core/functions.ts";
import type { Id } from "../core/schema.ts";
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

/** A member's albums with how many photos each holds. Visitors only see albums that have photos. */
export const byUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    ctx.db.touch("photoAlbums", "profilePhotos");
    const me = await getCurrentUserDoc(ctx);
    const rows = await ctx.db.rows(sql`
      select a.id::text as id, a.name,
             (select count(*) from public.profile_photos p where p.album_id = a.id)::int as photos
        from public.photo_albums a
       where a.user_id = ${userId}::uuid
       order by a.created_at, a.id
       limit ${ALBUMS_MAX}::int`);
    const mine = me?._id === userId;
    return rows
      .filter((r) => mine || Number(r.photos) > 0)
      .map((r) => ({ _id: String(r.id) as Id<"photoAlbums">, name: String(r.name), photos: Number(r.photos) }));
  },
});
