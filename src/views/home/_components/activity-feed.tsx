import { useState } from "react";
import { usePaginatedQuery, useQuery } from "@/lib/backend/react.tsx";
import {
  ArrowDownWideNarrow,
  ChevronDown,
  Flame,
  Globe,
  List,
  Plus,
  RefreshCw,
  Repeat2,
  Rss,
} from "lucide-react";
import { motion } from "motion/react";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useAccess } from "@/hooks/use-access.ts";
import { useUpgradeGate } from "@/hooks/use-upgrade-gate.ts";
import { cn } from "@/lib/utils.ts";
import { FEED_FILTERS, isFeedFilter, type FeedFilter, type FeedSort } from "../_lib/feed.ts";
import PostCard from "./post-card.tsx";
import AddPostDialog from "./add-post-dialog.tsx";
import RepostDialog from "./repost-dialog.tsx";

const PAGE = 10;
const PILL_OUTLINE =
  "h-10 cursor-pointer gap-1.5 rounded-full border-2 border-violet-600 bg-transparent px-4 font-bold text-violet-300 hover:bg-violet-800/30 hover:text-violet-200";

function FeedSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-white/10 py-6">
          <Skeleton className="size-14 shrink-0 rounded-full sm:size-20" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="aspect-square w-full max-w-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Signed-in home: activity feed modeled on the reference "Activity" page. */
export default function ActivityFeed() {
  const access = useAccess();
  const { sendToPlans } = useUpgradeGate();
  const me = useQuery(api.users.menu, {});
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [sort, setSort] = useState<FeedSort>("newest");
  const [composer, setComposer] = useState<"post" | "repost" | null>(null);
  // Bumping the key remounts the list, re-subscribing from the first page
  const [refreshKey, setRefreshKey] = useState(0);

  const canPost = !!access?.can.post;
  const isSeller = me?.accountType === "seller" || !!access?.isAdmin;
  const filterLabel = FEED_FILTERS.find((f) => f.value === filter)?.label ?? "All";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col gap-2"
      >
        <h1 className="flex flex-wrap items-baseline gap-x-3 font-display text-4xl md:text-5xl">
          Activity <span className="text-2xl italic text-violet-600 md:text-3xl">What&apos;s happening?</span>
        </h1>
        <span className="h-1 w-24 rounded-full bg-violet-600" />
      </motion.header>

      <div className="flex items-center justify-between gap-3 pt-6">
        {canPost ? (
          <div className="flex">
            <Button
              onClick={() => setComposer("post")}
              className="h-11 cursor-pointer rounded-l-full rounded-r-none px-5 text-base font-bold"
            >
              <Plus className="size-5" /> Add Post
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="More post options"
                  className="h-11 cursor-pointer rounded-l-none rounded-r-full border-l border-primary-foreground/30 px-3"
                >
                  <ChevronDown className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem className="cursor-pointer" onSelect={() => setComposer("post")}>
                  <Plus /> Status or photos
                </DropdownMenuItem>
                {isSeller && me && (
                  <DropdownMenuItem className="cursor-pointer" onSelect={() => setComposer("repost")}>
                    <Repeat2 /> Repost a listing
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : access === undefined ? (
          <Skeleton className="h-11 w-40 rounded-full" />
        ) : access?.accountType === "seller" ? (
          <Button
            onClick={() => sendToPlans("post")}
            className="h-11 cursor-pointer rounded-full px-5 text-base font-bold"
          >
            <Plus className="size-5" /> Add Post
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Choose an account type to start posting.</p>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh feed"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="size-11 cursor-pointer"
        >
          <RefreshCw className="size-6" />
        </Button>
      </div>

      <Separator className="my-5 bg-white/10" />

      <div className="flex items-center justify-between gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={PILL_OUTLINE}>
              <List className="size-4" />
              <Globe className="size-4" /> {filterLabel} <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup value={filter} onValueChange={(v) => isFeedFilter(v) && setFilter(v)}>
              {FEED_FILTERS.map((f) => (
                <DropdownMenuRadioItem key={f.value} value={f.value} className="cursor-pointer">
                  {f.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          onClick={() => setSort((s) => (s === "newest" ? "popular" : "newest"))}
          aria-label={sort === "newest" ? "Sorted by newest. Switch to popular" : "Sorted by popular. Switch to newest"}
          className={PILL_OUTLINE}
        >
          <ArrowDownWideNarrow className={cn("size-4", sort === "popular" && "opacity-40")} />
          <Flame className={cn("size-4", sort === "newest" && "opacity-40")} />
          <span className="hidden text-sm sm:inline">{sort === "newest" ? "Newest" : "Popular"}</span>
        </Button>
      </div>

      <Separator className="mt-5 bg-white/10" />

      <FeedList key={`${filter}-${sort}-${refreshKey}`} filter={filter} sort={sort} onCompose={canPost ? () => setComposer("post") : null} />

      <AddPostDialog open={composer === "post"} onOpenChange={(o) => setComposer(o ? "post" : null)} />
      {me && (
        <RepostDialog
          sellerId={me._id}
          open={composer === "repost"}
          onOpenChange={(o) => setComposer(o ? "repost" : null)}
        />
      )}
    </div>
  );
}

function FeedList({
  filter,
  sort,
  onCompose,
}: {
  filter: FeedFilter;
  sort: FeedSort;
  onCompose: (() => void) | null;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.feed,
    { filter, sort },
    { initialNumItems: PAGE },
  );
  // Online dots come from a separate small query so heartbeats don't re-run the whole feed
  const authorIds = [...new Set(results.map((r) => r.author._id))];
  const online = useQuery(api.posts.onlineAuthors, authorIds.length ? { userIds: authorIds } : "skip");
  const onlineSet = new Set(online ?? []);

  if (status === "LoadingFirstPage") return <FeedSkeleton />;

  if (results.length === 0 && status === "Exhausted") {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Rss />
          </EmptyMedia>
          <EmptyTitle>Nothing here yet</EmptyTitle>
          <EmptyDescription>
            {filter === "all"
              ? "Posts, new photos and listings from the community will show up here."
              : "No activity of this type yet. Try another filter."}
          </EmptyDescription>
        </EmptyHeader>
        {onCompose && (
          <EmptyContent>
            <Button size="sm" onClick={onCompose} className="cursor-pointer">
              <Plus /> Add the first post
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <div className="flex flex-col rounded-[3px] border border-[#101626] bg-slate-900/75 px-4 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.6)] [&>article:last-of-type]:border-b-0">
      {results.map((item) => (
        <PostCard key={item._id} item={item} online={onlineSet.has(item.author._id)} />
      ))}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <Button
          variant="secondary"
          onClick={() => loadMore(PAGE)}
          disabled={status === "LoadingMore"}
          className="mx-auto my-4 cursor-pointer"
        >
          {status === "LoadingMore" && <Spinner />} Load more
        </Button>
      )}
    </div>
  );
}
