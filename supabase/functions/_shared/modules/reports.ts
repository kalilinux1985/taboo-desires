import { AppError } from "../core/errors.ts";
import { mutation, query } from "../core/functions.ts";
import type { Doc, Id, ReportTargetKind, ReportType } from "../core/schema.ts";
import { sql } from "../core/sql.ts";
import { paginationOptsValidator, v } from "../core/values.ts";
import { getCurrentUserDoc, publicSellerName } from "../lib/auth.ts";
import { deleteListingCascade } from "../lib/listingDelete.ts";
import { deletePostCascade } from "../lib/posts.ts";
import { requireAdmin } from "../lib/subscription.ts";
import { queueEmail, queueEmailToAddress, reportInbox, siteUrl } from "../lib/email.ts";
import { getAuctionByListing } from "../lib/auctionState.ts";

const HOUR = 3_600_000;
/** Reports of intimate images shared without consent, or of anyone under 18, are due within 48 hours. */
const URGENT_HOURS = 48;
const NORMAL_HOURS = 24 * 7;
const URGENT_TYPES: ReportType[] = ["nonconsensual_intimate", "underage"];
const HOURLY_LIMIT = 5;
const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  nonconsensual_intimate: "Intimate image shared without consent",
  underage: "Person under 18",
  copyright: "Copyright",
  illegal: "Illegal content",
  harassment: "Harassment",
  other: "Other",
};

const typeValidator = v.union(
  v.literal("nonconsensual_intimate"),
  v.literal("underage"),
  v.literal("copyright"),
  v.literal("illegal"),
  v.literal("harassment"),
  v.literal("other"),
);
const targetValidator = v.union(
  v.literal("listing"),
  v.literal("post"),
  v.literal("comment"),
  v.literal("profile"),
  v.literal("other"),
);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type QueryCtxLike = Parameters<typeof requireAdmin>[0];

const bad = (message: string) => new AppError({ code: "BAD_REQUEST", message });

/** Content with this many different people's open reports is hidden until an admin decides. */
const AUTO_HIDE_AT = 2;

/** How many different people have an open report on this content. */
async function openReporters(ctx: QueryCtxLike, kind: ReportTargetKind, id: string): Promise<number> {
  const rows = await ctx.db.rows(sql`
    select count(distinct reporter_email)::int as n from public.content_reports
     where status = 'open' and target_kind = ${kind} and target_id = ${id}`);
  return Number((rows[0] as { n: number } | undefined)?.n ?? 0);
}

/** Hides a listing, post or comment. Returns the owner (to tell them) or null when nothing changed. */
async function hideTarget(ctx: QueryCtxLike, kind: ReportTargetKind, id: string) {
  if (kind === "listing") {
    const l = await ctx.db.get("listings", id as Id<"listings">);
    if (!l || l.status === "hidden") return null;
    await ctx.db.patch("listings", l._id, { status: "hidden", hiddenPrevStatus: l.status });
    return { ownerId: l.sellerId, what: `your listing "${l.title}"` };
  }
  if (kind === "post") {
    const p = await ctx.db.get("posts", id as Id<"posts">);
    if (!p || p.hidden) return null;
    await ctx.db.patch("posts", p._id, { hidden: true });
    return { ownerId: p.authorId, what: "one of your posts" };
  }
  if (kind === "comment") {
    const c = await ctx.db.get("postComments", id as Id<"postComments">);
    if (!c || c.hidden) return null;
    await ctx.db.patch("postComments", c._id, { hidden: true });
    return { ownerId: c.authorId, what: "one of your comments" };
  }
  return null;
}

/** Puts hidden content back (after the reports against it were dismissed). */
async function unhideTarget(ctx: QueryCtxLike, kind: ReportTargetKind, id: string) {
  if (kind === "listing") {
    const l = await ctx.db.get("listings", id as Id<"listings">);
    if (!l || l.status !== "hidden") return;
    let status = l.hiddenPrevStatus ?? "active";
    // An auction that finished while the listing was hidden: settle it the way the close job would
    const auction = await getAuctionByListing(ctx, l._id);
    if (auction?.status === "ended") status = (auction.bidCount ?? 0) > 0 ? "sold" : "ended";
    await ctx.db.patch("listings", l._id, { status, hiddenPrevStatus: undefined });
  } else if (kind === "post") {
    const p = await ctx.db.get("posts", id as Id<"posts">);
    if (p?.hidden) await ctx.db.patch("posts", p._id, { hidden: false });
  } else if (kind === "comment") {
    const c = await ctx.db.get("postComments", id as Id<"postComments">);
    if (c?.hidden) await ctx.db.patch("postComments", c._id, { hidden: false });
  }
}

/**
 * Anyone can report content or ask for a takedown, signed in or not
 * (the person shown in an image is often not a member).
 */
export const submit = mutation({
  args: {
    reportType: typeValidator,
    targetKind: targetValidator,
    targetId: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    description: v.string(),
    reporterName: v.string(),
    reporterEmail: v.string(),
    isDepicted: v.boolean(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await getCurrentUserDoc(ctx);
    const description = args.description.trim();
    const reporterName = args.reporterName.trim();
    const reporterEmail = args.reporterEmail.trim().toLowerCase();
    const signature = args.signature.trim();
    const targetId = args.targetId?.trim() || undefined;
    const targetUrl = args.targetUrl?.trim() || undefined;

    if (description.length < 10) throw bad("Please describe the problem (at least 10 characters)");
    if (description.length > 2000) throw bad("The description is too long");
    if (!reporterName || reporterName.length > 100) throw bad("Enter your name");
    if (!EMAIL.test(reporterEmail) || reporterEmail.length > 200) throw bad("Enter a valid email address");
    if (!signature || signature.length > 100) throw bad("Type your full name as your signature");
    if (targetId && !UUID.test(targetId)) throw bad("That link isn't valid");
    if (targetUrl && (targetUrl.length > 500 || !/^https?:\/\//i.test(targetUrl)))
      throw bad("Enter the full link (starting with https://)");
    if (!targetId && !targetUrl) throw bad("Tell us where the content is: add its link");

    // Simple brake against floods
    const recent = await ctx.db.rows(sql`
      select count(*)::int as n from public.content_reports
       where reporter_email = ${reporterEmail}
         and created_at > ${new Date(ctx.now() - HOUR).toISOString()}::timestamptz`);
    if (Number((recent[0] as { n: number } | undefined)?.n ?? 0) >= HOURLY_LIMIT)
      throw bad("Too many reports from this email. Please try again later.");

    const hours = URGENT_TYPES.includes(args.reportType) ? URGENT_HOURS : NORMAL_HOURS;
    const dueAt = new Date(ctx.now() + hours * HOUR).toISOString();
    const reportId = await ctx.db.insert("contentReports", {
      reportType: args.reportType,
      targetKind: args.targetKind,
      targetId,
      targetUrl,
      description,
      reporterName,
      reporterEmail,
      reporterUserId: me?._id,
      isDepicted: args.isDepicted,
      signature,
      status: "open",
      dueAt,
    });
    // Two or more different people reporting the same content hides it until an admin decides
    let hiddenNow = false;
    if (targetId && (args.targetKind === "listing" || args.targetKind === "post" || args.targetKind === "comment")) {
      const reporters = await openReporters(ctx, args.targetKind, targetId);
      if (reporters >= AUTO_HIDE_AT) {
        const owner = await hideTarget(ctx, args.targetKind, targetId);
        if (owner) {
          hiddenNow = true;
          const ownerDoc = await ctx.db.get("users", owner.ownerId);
          if (ownerDoc)
            await queueEmail(ctx, {
              to: ownerDoc,
              kind: "content_hidden",
              transactional: true,
              subject: "Your content is hidden while we review it",
              heading: "Hidden while we review",
              lines: [
                `We hid ${owner.what} because it was reported more than once. Our team will review it. If it follows our rules, it will be put back. If not, it will be removed.`,
              ],
              dedupeKey: `content_hidden:${args.targetKind}:${targetId}:${reportId}`,
            });
        }
      }
    }
    // Alert the content-report mailbox (reply goes to the person who reported)
    const urgent = URGENT_TYPES.includes(args.reportType);
    const location = targetUrl ?? (targetId ? `${args.targetKind} ${targetId}` : "");
    await queueEmailToAddress(ctx, {
      toEmail: reportInbox(),
      replyTo: reporterEmail,
      kind: "content_report",
      subject: `${urgent ? "URGENT: " : ""}Content report: ${REPORT_TYPE_LABEL[args.reportType]}`,
      heading: urgent ? "Urgent content report" : "New content report",
      lines: [
        `Type: ${REPORT_TYPE_LABEL[args.reportType]}`,
        `What it is: ${args.targetKind}`,
        `Where: ${location}`,
        `Reported by: ${reporterName} <${reporterEmail}>${me ? " (signed in member)" : " (not signed in)"}`,
        `Person shown in the content: ${args.isDepicted ? "Yes, the reporter is shown in it" : "No"}`,
        `Signed: ${signature}`,
        ...(hiddenNow ? ["Auto-hidden: this content has 2 or more reports, so it is now hidden until you decide."] : []),
        `Respond by: ${new Date(dueAt).toUTCString()}`,
        "Details:",
        description,
      ],
      button: { label: "Open the report queue", path: "/admin" },
      footer: `Sent to the content-report inbox. Reply to this email to answer ${reporterName}. Queue: ${siteUrl()}/admin`,
      dedupeKey: `content_report:${reportId}`,
    });
    return null;
  },
});

/** What a report points at, for the admin queue. */
async function describeTarget(
  ctx: Parameters<typeof requireAdmin>[0],
  kind: ReportTargetKind,
  id: string | undefined,
) {
  if (!id) return null;
  if (kind === "listing") {
    const l = await ctx.db.get("listings", id as Id<"listings">);
    if (!l) return { exists: false, label: "Listing (already removed)", path: null };
    return { exists: true, label: `Listing: ${l.title}`, path: `/listing/${l._id}` };
  }
  if (kind === "post") {
    const p = await ctx.db.get("posts", id as Id<"posts">);
    if (!p) return { exists: false, label: "Post (already removed)", path: null };
    const a = await ctx.db.get("users", p.authorId);
    return {
      exists: true,
      label: `Post by ${a ? publicSellerName(a) : "a deleted user"}: ${p.body.slice(0, 80)}`,
      path: `/seller/${p.authorId}?post=${p._id}`,
    };
  }
  if (kind === "comment") {
    const c = await ctx.db.get("postComments", id as Id<"postComments">);
    if (!c) return { exists: false, label: "Comment (already removed)", path: null };
    const p = await ctx.db.get("posts", c.postId);
    return {
      exists: true,
      label: `Comment: ${c.body.slice(0, 80)}`,
      path: p ? `/seller/${p.authorId}?post=${p._id}&comments=1` : null,
    };
  }
  if (kind === "profile") {
    const u = await ctx.db.get("users", id as Id<"users">);
    if (!u) return { exists: false, label: "Profile (deleted)", path: null };
    return { exists: true, label: `Profile: ${publicSellerName(u)}`, path: `/seller/${u._id}` };
  }
  return null;
}

/** Open reports, the ones due soonest first. */
export const adminOpen = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db.paginate(
      "contentReports",
      { where: sql`status = 'open'`, order: [{ column: "due_at", cast: "timestamptz" }], direction: "asc" },
      paginationOpts,
    );
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (r: Doc<"contentReports">) => ({
          _id: r._id,
          reportType: r.reportType,
          targetKind: r.targetKind,
          targetUrl: r.targetUrl ?? null,
          description: r.description,
          reporterName: r.reporterName,
          reporterEmail: r.reporterEmail,
          isDepicted: r.isDepicted,
          signature: r.signature,
          createdAt: r._creationTime,
          dueAt: new Date(r.dueAt).getTime(),
          target: await describeTarget(ctx, r.targetKind, r.targetId),
        })),
      ),
    };
  },
});

/** How many reports are waiting, and how many are already past their deadline. */
export const adminCounts = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserDoc(ctx);
    if (me?.role !== "admin") return null;
    ctx.db.touch("contentReports");
    const rows = await ctx.db.rows(sql`
      select count(*)::int as open,
             count(*) filter (where due_at < ${new Date(ctx.now()).toISOString()}::timestamptz)::int as overdue
        from public.content_reports where status = 'open'`);
    const r = rows[0] as { open: number; overdue: number } | undefined;
    return { open: Number(r?.open ?? 0), overdue: Number(r?.overdue ?? 0) };
  },
});

/** Admin decision: take the content down, or dismiss the report. */
export const resolve = mutation({
  args: {
    reportId: v.id("contentReports"),
    remove: v.boolean(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { reportId, remove, note }) => {
    const admin = await requireAdmin(ctx);
    const report = await ctx.db.get("contentReports", reportId);
    if (!report || report.status !== "open") throw bad("This report is already closed");
    const text = note?.trim();
    if (text && text.length > 500) throw bad("The note is too long");

    if (remove && report.targetId) {
      if (report.targetKind === "listing") {
        const listing = await ctx.db.get("listings", report.targetId as Id<"listings">);
        if (listing) await deleteListingCascade(ctx, listing);
      } else if (report.targetKind === "post") {
        const post = await ctx.db.get("posts", report.targetId as Id<"posts">);
        if (post) await deletePostCascade(ctx, post);
      } else if (report.targetKind === "comment") {
        await ctx.db.delete("postComments", report.targetId as Id<"postComments">);
      }
    }
    await ctx.db.patch("contentReports", reportId, {
      status: remove ? "removed" : "dismissed",
      resolvedAt: new Date(ctx.now()).toISOString(),
      resolvedBy: admin._id,
      resolutionNote: text || undefined,
    });
    // Dismissed: put the content back once fewer than 2 people still have it reported
    if (!remove && report.targetId && report.targetKind !== "profile" && report.targetKind !== "other") {
      if ((await openReporters(ctx, report.targetKind, report.targetId)) < AUTO_HIDE_AT)
        await unhideTarget(ctx, report.targetKind, report.targetId);
    }
    return null;
  },
});
