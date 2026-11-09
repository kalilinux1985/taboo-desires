import { useState, type MouseEvent } from "react";
import { useBackendAuth, useMutation, useQuery } from "@/lib/backend/react.tsx";
import { BookmarkCheck, BookmarkPlus, Heart } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";

/** Heart toggle that saves a listing. Signed-out users are sent to sign in. */
export default function FavoriteButton({
  listingId,
  sellerId,
  className,
  withLabel = false,
  variant = "heart",
}: {
  listingId: Id<"listings">;
  sellerId: Id<"users">;
  className?: string;
  withLabel?: boolean;
  /** "bookmark": a plain violet bookmark icon (seller profile cards) */
  variant?: "heart" | "bookmark";
}) {
  const { isAuthenticated } = useBackendAuth();
  const { signin } = useAuth();
  // Same subscription for every card, so this is shared rather than per-card
  const me = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");
  const saved = useQuery(api.favorites.isFavorite, isAuthenticated ? { listingId } : "skip");
  const toggle = useMutation(api.favorites.toggle);
  const [busy, setBusy] = useState(false);

  const onClick = async (e: MouseEvent) => {
    // Cards are links; keep the click on the heart
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast("Sign in to save listings");
      await signin();
      return;
    }
    setBusy(true);
    try {
      const now = await toggle({ listingId });
      toast.success(now ? "Saved to favorites" : "Removed from favorites");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update favorites"));
    } finally {
      setBusy(false);
    }
  };

  if (me?._id === sellerId) return null;

  if (variant === "bookmark") {
    const Icon = saved ? BookmarkCheck : BookmarkPlus;
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-pressed={!!saved}
        aria-label={saved ? "Remove from favorites" : "Save to favorites"}
        className={cn("cursor-pointer text-violet-600 transition-colors hover:text-violet-400 disabled:opacity-60", className)}
      >
        <Icon className="size-[18px]" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={!!saved}
      aria-label={saved ? "Remove from favorites" : "Save to favorites"}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-2 rounded-full bg-background/90 text-foreground shadow-md transition-transform hover:scale-105 disabled:opacity-60",
        withLabel ? "h-10 px-4 text-sm font-semibold" : "size-8",
        className,
      )}
    >
      <Heart className={cn("size-4", saved && "text-violet-600")} strokeWidth={saved ? 3 : 2} />
      {withLabel && (saved ? "Saved" : "Save")}
    </button>
  );
}
