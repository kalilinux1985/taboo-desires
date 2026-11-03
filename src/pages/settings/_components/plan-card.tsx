import { Link } from "react-router-dom";
import { useQuery } from "@/lib/backend/react.tsx";
import { format } from "date-fns";
import { ArrowRight, Clock, Crown } from "lucide-react";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

/** Seller-only settings card showing the current plan and a manage/upgrade path. */
export default function PlanCard() {
  const mine = useQuery(api.subscriptions.mine, {});
  if (mine === undefined) return <Skeleton className="h-48 w-full" />;
  if (mine === null) return null;

  const isPro = mine.plan === "pro";
  const pending = !isPro && mine.status === "pending";
  const Icon = pending ? Clock : Crown;
  const description = isPro
    ? `Auctions, ${mine.limits.maxPhotos} photos per listing, and featured placement are on.`
    : pending
      ? "Your Pro request is being reviewed."
      : `${mine.limits.maxPhotos} photos per listing, no auctions.`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl">
          <Icon className="size-5 text-violet-500" /> {isPro ? "Pro plan" : "Free plan"}
        </CardTitle>
        <CardDescription>
          {isPro && mine.expiresAt && (
            <span className="block font-medium text-foreground">
              Active until {format(new Date(mine.expiresAt), "MMM d, yyyy")}
            </span>
          )}
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm" variant={isPro ? "secondary" : "default"} className="w-full cursor-pointer">
          <Link to="/pricing">
            {isPro ? "Manage plan" : pending ? "View request" : "Upgrade to Pro"} <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
