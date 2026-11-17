import { useState } from "react";
import Link from "next/link";
import { useMutation, usePaginatedQuery } from "@/lib/backend/react.tsx";
import { formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle, ExternalLink, Flag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import type { Id } from "@/lib/backend/types.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { getErrorMessage } from "@/lib/listings.ts";
import { REPORT_TYPES } from "@/components/report-form.tsx";

function Controls({ reportId, canRemove }: { reportId: Id<"contentReports">; canRemove: boolean }) {
  const resolve = useMutation(api.reports.resolve);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const decide = async (remove: boolean) => {
    setBusy(true);
    try {
      await resolve({ reportId, remove, note });
      toast.success(remove ? "Content removed" : "Report dismissed");
    } catch (e) {
      toast.error(getErrorMessage(e, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Input placeholder="Note (optional, kept in the record)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="destructive" disabled={busy} className="cursor-pointer" onClick={() => decide(true)}>
          {busy ? <Spinner /> : <Trash2 />} {canRemove ? "Remove content" : "Mark as handled"}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} className="cursor-pointer" onClick={() => decide(false)}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

/** Admin queue of reports and takedown requests, the ones due soonest first. */
export default function ReportsQueue() {
  const { results, status, loadMore } = usePaginatedQuery(api.reports.adminOpen, {}, { initialNumItems: 20 });

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }
  if (results.length === 0 && status === "Exhausted") {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Flag />
          </EmptyMedia>
          <EmptyTitle>No open reports</EmptyTitle>
          <EmptyDescription>Reports and takedown requests will show up here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {results.map((r) => {
        const label = REPORT_TYPES.find((t) => t.value === r.reportType)?.label ?? r.reportType;
        const overdue = r.dueAt < Date.now();
        const urgent = r.reportType === "nonconsensual_intimate" || r.reportType === "underage";
        const canRemove = !!r.target?.exists && r.targetKind !== "profile";
        return (
          <Card key={r._id}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={urgent ? "destructive" : "secondary"}>{label}</Badge>
                <Badge variant={overdue ? "destructive" : "outline"} className="gap-1">
                  {overdue && <AlertTriangle className="size-3" />}
                  {overdue
                    ? `Overdue by ${formatDistanceToNowStrict(r.dueAt)}`
                    : `Due in ${formatDistanceToNowStrict(r.dueAt)}`}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Received {formatDistanceToNowStrict(r.createdAt, { addSuffix: true })}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                {r.target ? (
                  r.target.path ? (
                    <Link href={r.target.path} target="_blank" className="flex w-fit cursor-pointer items-center gap-1 text-violet-600 hover:underline">
                      {r.target.label} <ExternalLink className="size-3.5" />
                    </Link>
                  ) : (
                    <span>{r.target.label}</span>
                  )
                ) : null}
                {r.targetUrl && (
                  <a href={r.targetUrl} target="_blank" rel="noreferrer" className="w-fit break-all text-xs text-muted-foreground hover:underline">
                    {r.targetUrl}
                  </a>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm">{r.description}</p>
              <p className="text-xs text-muted-foreground">
                From {r.reporterName} ({r.reporterEmail}), signed "{r.signature}"
                {r.isDepicted ? ". Says they are the person shown or act for them." : "."}
              </p>
              <Controls reportId={r._id} canRemove={canRemove} />
            </CardContent>
          </Card>
        );
      })}
      {status === "CanLoadMore" && (
        <Button variant="outline" className="w-fit cursor-pointer" onClick={() => loadMore(20)}>
          Load more
        </Button>
      )}
    </div>
  );
}
