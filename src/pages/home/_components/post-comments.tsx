import { useState } from "react";
import { usePaginatedQuery, useMutation } from "@/lib/backend/react.tsx";
import { Authenticated, Unauthenticated } from "@/lib/backend/react.tsx";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { shortAge } from "../_lib/feed.ts";

/** Comment thread under a post. Only subscribed while open. */
export default function PostComments({ postId }: { postId: Id<"posts"> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.listComments,
    { postId },
    { initialNumItems: 10 },
  );
  const add = useMutation(api.posts.addComment);
  const remove = useMutation(api.posts.removeComment);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await add({ postId, body });
      setBody("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not comment"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-background/50 p-3">
      <Authenticated>
        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={body}
            maxLength={500}
            placeholder="Write a comment..."
            onChange={(e) => setBody(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={!body.trim() || sending} className="h-9 cursor-pointer">
            {sending && <Spinner />} Send
          </Button>
        </form>
      </Authenticated>
      <Unauthenticated>
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          Sign in to comment.
          <SignInButton size="sm" />
        </div>
      </Unauthenticated>

      {status === "LoadingFirstPage" ? (
        <Skeleton className="h-10 w-full" />
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {results.map((c) => (
            <li key={c._id} className="flex items-start gap-2">
              <Link to={`/seller/${c.author._id}`} className="cursor-pointer">
                <ProfileAvatar name={c.author.name} url={c.author.avatarUrl} className="size-8 text-sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2 text-sm">
                  <Link to={`/seller/${c.author._id}`} className="cursor-pointer font-semibold hover:underline">
                    {c.author.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">{shortAge(c._creationTime)}</span>
                </p>
                <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{c.body}</p>
              </div>
              {c.canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete comment"
                  className="size-7 cursor-pointer text-muted-foreground"
                  onClick={() => remove({ commentId: c._id }).catch((e) => toast.error(getErrorMessage(e, "Could not delete")))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {status === "CanLoadMore" && (
        <Button variant="ghost" size="sm" onClick={() => loadMore(10)} className="cursor-pointer self-start">
          Show older comments
        </Button>
      )}
    </div>
  );
}
