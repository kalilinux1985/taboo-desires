// Wording, icon and link for each kind of notification, shared by the
// Notifications page and the bell's dropdown in the header.
import type { ComponentType } from "react";
import { Check, Gavel, Heart, MessageSquare, Sparkles, Star, Trophy, Unlock, UserPlus, X } from "lucide-react";
import type { api } from "@/lib/backend/api.ts";
import type { FunctionReturnType } from "@/lib/backend/types.ts";
import { formatPrice } from "@/lib/listings.ts";

export type Notification = NonNullable<FunctionReturnType<typeof api.notifications.list>>[number];
type Icon = ComponentType<{ className?: string }>;

/** Icon, sentence and link for each kind of notification. */
export function describeNotification(n: Notification): { icon: Icon; text: string; href: string } {
  const who = n.actor ?? "Someone";
  const money = n.amountCents != null ? formatPrice(n.amountCents) : "";
  switch (n.kind) {
    case "follow":
      return { icon: UserPlus, text: `${who} started following you`, href: n.actorId ? `/seller/${n.actorId}` : "/shop" };
    case "bid":
      return { icon: Gavel, text: `${who} bid ${money} on “${n.title}”`, href: `/listing/${n.targetId}` };
    case "auction_won":
      return { icon: Trophy, text: `You won “${n.title}” for ${money}`, href: `/listing/${n.targetId}` };
    case "custom_request":
      return { icon: Sparkles, text: `${who} sent you a custom request (${money})`, href: "/customs" };
    case "custom_answered":
      return {
        icon: n.title === "accepted" ? Check : X,
        text: `${who} ${n.title} your custom request`,
        href: "/customs?tab=sent",
      };
    case "unlock_request":
      return { icon: Unlock, text: `${who} asked to unlock “${n.title}”`, href: `/listing/${n.targetId}` };
    case "unlock_granted":
      return { icon: Unlock, text: `${who} unlocked “${n.title}” for you`, href: `/listing/${n.targetId}` };
    case "review":
      return { icon: Star, text: `${who} left you a ${n.amountCents}-star review`, href: "/shop" };
    case "post_like":
      return { icon: Heart, text: `${who} liked your post`, href: "/" };
    case "post_comment":
      return { icon: MessageSquare, text: `${who} commented on your post`, href: "/" };
  }
}

