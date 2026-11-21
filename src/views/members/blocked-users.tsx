"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useMutation, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import ProfileAvatar from "@/components/profile-avatar.tsx";
import RequireAuth from "@/components/require-auth.tsx";

function BlockedList() {
  const blocked = useQuery(api.blocks.list, {});
  const toggle = useMutation(api.blocks.toggle);
  if (blocked === undefined) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-[5px]" />
        ))}
      </div>
    );
  }
  if (blocked.length === 0) {
    return <p className="text-sm text-muted-foreground">You haven't blocked anyone.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {blocked.map((u) => (
        <li key={u._id} className="flex items-center gap-3 rounded-[5px] bg-[#202227] p-3">
          <Link href={`/seller/${u._id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <ProfileAvatar name={u.name} url={u.avatarUrl} className="size-10 text-lg" />
            <span className="truncate font-medium text-white">{u.name}</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={async () => {
              try {
                await toggle({ userId: u._id });
                toast.success(`Unblocked ${u.name}`);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Couldn't unblock");
              }
            }}
          >
            Unblock
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** Members you've blocked, with Unblock. */
export default function BlockedUsers() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="pb-4 text-2xl font-bold text-white">Blocked Users</h1>
      <RequireAuth>
        <BlockedList />
      </RequireAuth>
    </div>
  );
}
