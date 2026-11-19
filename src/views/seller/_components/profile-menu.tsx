import { useState } from "react";
import { useBackendAuth, useMutation, useQuery } from "@/lib/backend/react.tsx";
import { Ban, Clock, EllipsisVertical, Flag, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";
import { ReportDialog } from "@/components/report-button.tsx";
import { useAccess } from "@/hooks/use-access.ts";
import { useUpgradeGate } from "@/hooks/use-upgrade-gate.ts";
import { getErrorMessage } from "@/lib/listings.ts";
import { cn } from "@/lib/utils.ts";
import { OUTLINED_ACTION } from "../_lib/profile-design.tsx";

/**
 * The "..." menu on someone else's profile, above the bio: Follow (buyers
 * follow sellers, Premium sellers follow buyers), Block and Report.
 */
export default function ProfileMenu({ userId, targetType }: { userId: Id<"users">; targetType: "seller" | "buyer" | null }) {
  const { isAuthenticated } = useBackendAuth();
  const access = useAccess();
  const { blockAndRedirect } = useUpgradeGate();
  const follow = useQuery(api.follows.isFollowing, isAuthenticated ? { sellerId: userId } : "skip");
  const blocked = useQuery(api.blocks.isBlocked, isAuthenticated ? { userId } : "skip");
  const toggleFollow = useMutation(api.follows.toggle);
  const toggleBlock = useMutation(api.blocks.toggle);
  const [reporting, setReporting] = useState(false);

  // Buyers follow sellers only; sellers (Premium) follow buyers only
  const canFollow =
    isAuthenticated &&
    !!access &&
    ((access.accountType === "buyer" && targetType === "seller") ||
      (access.accountType === "seller" && targetType === "buyer"));

  const onFollow = async () => {
    if (follow === "none" && blockAndRedirect("follow")) return;
    try {
      const now = await toggleFollow({ sellerId: userId });
      toast.success(now === "pending" ? "Follow request sent. You'll follow once they accept." : "Unfollowed");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not update follow"));
    }
  };
  const onBlock = async () => {
    try {
      const now = await toggleBlock({ userId });
      toast.success(now ? "Blocked. You won't be able to follow or message each other." : "Unblocked");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not update block"));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="More options" className={cn(OUTLINED_ACTION, "w-[37px]")}>
            <EllipsisVertical className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {canFollow && (
            <DropdownMenuItem className="cursor-pointer" disabled={follow === undefined} onSelect={() => void onFollow()}>
              {follow === "pending" ? <Clock /> : follow === "following" ? <UserCheck /> : <UserPlus />}
              {follow === "pending" ? "Cancel follow request" : follow === "following" ? "Unfollow" : "Follow"}
            </DropdownMenuItem>
          )}
          {isAuthenticated && (
            <DropdownMenuItem className="cursor-pointer" onSelect={() => void onBlock()}>
              <Ban /> {blocked ? "Unblock" : "Block"}
            </DropdownMenuItem>
          )}
          {(canFollow || isAuthenticated) && <DropdownMenuSeparator />}
          <DropdownMenuItem className="cursor-pointer" onSelect={() => setReporting(true)}>
            <Flag /> Report user
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog target={{ kind: "profile", id: userId }} open={reporting} onOpenChange={setReporting} />
    </>
  );
}
