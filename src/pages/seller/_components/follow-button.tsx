import { useState } from "react";
import { Authenticated, Unauthenticated, useMutation, useQuery } from "@/lib/backend/react.tsx";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";

function FollowToggle({ sellerId }: { sellerId: Id<"users"> }) {
  const following = useQuery(api.follows.isFollowing, { sellerId });
  const toggle = useMutation(api.follows.toggle);
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      const now = await toggle({ sellerId });
      toast.success(now ? "Following. New listings will show in your feed." : "Unfollowed");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not update follow"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size="sm"
      variant={following ? "secondary" : "default"}
      onClick={onClick}
      disabled={busy || following === undefined}
      className="cursor-pointer"
    >
      {busy ? <Spinner /> : <Heart className={cn(following && "fill-violet-500 text-violet-500")} />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}

export default function FollowButton({ sellerId }: { sellerId: Id<"users"> }) {
  return (
    <>
      <Authenticated>
        <FollowToggle sellerId={sellerId} />
      </Authenticated>
      <Unauthenticated>
        <SignInButton size="sm" signInText="Sign in to follow" showIcon={false} />
      </Unauthenticated>
    </>
  );
}
