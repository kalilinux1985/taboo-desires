import type { ReactNode } from "react";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
} from "@/lib/backend/react.tsx";
import { Lock } from "lucide-react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";

/** Renders children only for signed-in users, with a sign-in prompt otherwise. */
export default function RequireAuth({
  children,
  message = "Sign in to continue.",
}: {
  children: ReactNode;
  message?: string;
}) {
  return (
    <>
      <AuthLoading>
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <Empty className="py-24">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Lock />
            </EmptyMedia>
            <EmptyTitle>Sign in required</EmptyTitle>
            <EmptyDescription>{message}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <SignInButton size="sm" />
          </EmptyContent>
        </Empty>
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  );
}
