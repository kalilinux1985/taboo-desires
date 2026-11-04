import Link from "next/link";
import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

/** Inline notice shown in place of an action the user's account can't perform yet. */
export default function UpgradeNotice({
  message,
  showUpgrade = true,
  className,
}: {
  message: string;
  showUpgrade?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="flex items-center gap-3 text-sm">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-violet-500">
          <Lock className="size-4" />
        </span>
        {message}
      </p>
      {showUpgrade && (
        <Button asChild size="sm" className="shrink-0 cursor-pointer">
          <Link href="/pricing">
            <Crown /> Go Pro
          </Link>
        </Button>
      )}
    </div>
  );
}
