import { useState } from "react";
import { usePaginatedQuery, useMutation } from "@/lib/backend/react.tsx";
import { Check, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import { formatPrice, getErrorMessage } from "@/lib/listings.ts";

/** Lets a seller push one of their active listings back to the top of the feed. */
export default function RepostDialog({
  sellerId,
  open,
  onOpenChange,
}: {
  sellerId: Id<"users">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const repost = useMutation(api.posts.repostListing);
  const { results, status, loadMore } = usePaginatedQuery(
    api.listings.bySeller,
    open ? { sellerId, status: "active" } : "skip",
    { initialNumItems: 12 },
  );
  const [picked, setPicked] = useState<Id<"listings"> | null>(null);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!picked) return;
    setSaving(true);
    try {
      await repost({ listingId: picked, body });
      toast.success("Listing reposted");
      setPicked(null);
      setBody("");
      onOpenChange(false);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not repost"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Repost a listing</DialogTitle>
          <DialogDescription>Bump one of your active listings to the top of the feed.</DialogDescription>
        </DialogHeader>
        {status === "LoadingFirstPage" ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <Empty className="py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageOpen />
              </EmptyMedia>
              <EmptyTitle>No active listings</EmptyTitle>
              <EmptyDescription>List an item first, then you can repost it here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
            <div className="grid grid-cols-3 gap-3">
              {results.map((l) => (
                <button
                  key={l._id}
                  type="button"
                  onClick={() => setPicked(l._id)}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-1 rounded-md p-1 text-left ring-2 ring-transparent transition",
                    picked === l._id && "ring-violet-500",
                  )}
                >
                  <div className="aspect-square overflow-hidden rounded-sm bg-muted">
                    {l.imageUrl && <img src={l.imageUrl} alt={l.title} className="size-full object-cover" />}
                  </div>
                  <span className="truncate text-xs font-semibold">{l.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">{formatPrice(l.priceCents)}</span>
                  {picked === l._id && (
                    <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-4" />
                    </span>
                  )}
                </button>
              ))}
            </div>
            {status === "CanLoadMore" && (
              <Button variant="ghost" size="sm" onClick={() => loadMore(12)} className="cursor-pointer">
                Load more
              </Button>
            )}
          </div>
        )}
        <Textarea
          rows={2}
          maxLength={1000}
          placeholder="Add a note (optional)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={submit} disabled={!picked || saving} className="cursor-pointer">
            {saving && <Spinner />} Repost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
