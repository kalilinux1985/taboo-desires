import { Link } from "react-router-dom";
import AccountBadge from "@/components/account-badge.tsx";
import type { Id } from "@/lib/backend/types.ts";

export type ForumAuthor = { _id: Id<"users">; name: string; accountType: "seller" | "buyer" | null };

/** Author name linking to their shop, with initial avatar and Seller/Buyer badge. */
export default function AuthorChip({ author, size = "sm" }: { author: ForumAuthor; size?: "sm" | "md" }) {
  return (
    <Link
      to={`/seller/${author._id}`}
      className="flex min-w-0 cursor-pointer items-center gap-2 hover:text-violet-400"
    >
      <span
        className={
          size === "md"
            ? "flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-lg text-accent-foreground"
            : "flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground"
        }
      >
        {author.name.charAt(0).toUpperCase()}
      </span>
      <span className="truncate text-sm font-semibold">{author.name}</span>
      {author.accountType && <AccountBadge kind={author.accountType} />}
    </Link>
  );
}
