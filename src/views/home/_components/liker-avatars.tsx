import Link from "next/link";
import { PersonStanding } from "lucide-react";
import { useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { cn } from "@/lib/utils.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";

export type Liker = { _id: Id<"users">; name: string; avatarUrl: string | null };

/** One liker: their photo, or a small person icon when they have none. */
function LikerFace({ liker, className }: { liker: Liker; className?: string }) {
  return (
    <Link
      href={`/seller/${liker._id}`}
      title={liker.name}
      aria-label={liker.name}
      className={cn("flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[1px] bg-[#a8a9ae]", className)}
    >
      {liker.avatarUrl ? (
        <img src={liker.avatarUrl} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <PersonStanding className="size-[70%] text-[#2a2a2e]" />
      )}
    </Link>
  );
}

function LikersList({ postId }: { postId: Id<"posts"> }) {
  const likers = useQuery(api.posts.likers, { postId });
  if (likers === undefined) return <Skeleton className="h-40 w-full" />;
  if (likers.length === 0) return <p className="text-sm text-muted-foreground">No likes yet.</p>;
  return (
    <ul className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
      {likers.map((l) => (
        <li key={l._id} className="flex items-center gap-3">
          <LikerFace liker={l} className="size-9 bg-muted" />
          <Link href={`/seller/${l._id}`} className="cursor-pointer font-semibold hover:underline">
            {l.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Row of small liker faces; on posts with more likes, "More+" opens the full list. */
export default function LikerAvatars({
  likers,
  total,
  postId,
  size = "md",
}: {
  likers: Liker[];
  total: number;
  /** When set, "More+" lists everyone who liked this post */
  postId?: Id<"posts">;
  size?: "sm" | "md";
}) {
  const face = size === "sm" ? "size-5" : "size-6";
  return (
    <>
      {likers.map((l) => (
        <LikerFace key={l._id} liker={l} className={face} />
      ))}
      {postId && total > likers.length && (
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className="cursor-pointer text-muted-foreground hover:text-foreground">
              More+
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Liked by</DialogTitle>
            </DialogHeader>
            <LikersList postId={postId} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
