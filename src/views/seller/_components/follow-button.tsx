import { useState } from "react";
import { Authenticated, Unauthenticated, useMutation, useQuery } from "@/lib/backend/react.tsx";
import { Clock, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useAccess } from "@/hooks/use-access.ts";
import { useUpgradeGate } from "@/hooks/use-upgrade-gate.ts";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import { FILLED_ACTION, OUTLINED_ACTION, SERIF } from "../_lib/profile-design.tsx";

function FollowToggle({ userId, targetType }: { userId: Id<"users">; targetType: "seller" | "buyer" | null }) {
  const access = useAccess();
  const { blockAndRedirect } = useUpgradeGate();
  const state = useQuery(api.follows.isFollowing, { sellerId: userId });
  const toggle = useMutation(api.follows.toggle);
  const [busy, setBusy] = useState(false);

  // Buyers follow sellers; Premium sellers follow anyone
  if (!access || access.accountType == null) return null;
  if (access.accountType === "buyer" && targetType !== "seller") return null;

  const onClick = async () => {
    if (state === "none" && blockAndRedirect("follow")) return;
    setBusy(true);
    try {
      const now = await toggle({ sellerId: userId });
      toast.success(now === "pending" ? "Follow request sent. You'll follow once they accept." : "Unfollowed");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not update follow"));
    } finally {
      setBusy(false);
    }
  };

  const active = state === "following" || state === "pending";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || state === undefined}
      className={cn(active ? OUTLINED_ACTION : FILLED_ACTION, SERIF, "w-[168px] gap-1.5 text-[10px] font-bold uppercase")}
    >
      {busy ? (
        <Spinner />
      ) : state === "pending" ? (
        <Clock className="size-3.5" />
      ) : state === "following" ? (
        <UserCheck className="size-3.5" />
      ) : (
        <UserPlus className="size-3.5" />
      )}
      {state === "pending" ? "Requested" : state === "following" ? "Following" : "Follow"}
    </button>
  );
}

export default function FollowButton({ userId, targetType }: { userId: Id<"users">; targetType: "seller" | "buyer" | null }) {
  return (
    <>
      <Authenticated>
        <FollowToggle userId={userId} targetType={targetType} />
      </Authenticated>
      <Unauthenticated>
        <SignInButton size="sm" signInText="Sign in to follow" showIcon={false} />
      </Unauthenticated>
    </>
  );
}
