"use client";

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/navigation.ts";
import { useAuth } from "@/components/providers/auth.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  authCallbackMessages,
  type AuthCallbackMessages,
} from "./callback-messages.ts";
import { resolveReturnTo } from "./return-to.ts";

interface AuthCallbackProps {
  messages?: AuthCallbackMessages;
  /** How long to wait for the sign-in link to be confirmed before showing an error */
  timeoutMs?: number;
}

/**
 * Landing page for email links (account confirmation and magic links).
 * Supabase finishes the sign-in from the link's code; this page waits for the
 * session and then goes back to where the user started.
 */
export default function AuthCallback({
  messages: {
    loading = authCallbackMessages.en.loading,
    errorTitle = authCallbackMessages.en.errorTitle,
    missingState = authCallbackMessages.en.missingState,
    returnHome = authCallbackMessages.en.returnHome,
    tryAgain = authCallbackMessages.en.tryAgain,
  } = {},
  timeoutMs = 15_000,
}: AuthCallbackProps): React.JSX.Element {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthenticated, isLoading, error: authError, signin } = useAuth();
  const returnTo = resolveReturnTo(params.get("returnTo"));
  // Supabase puts link problems (expired, already used) in the URL
  // Supabase may also put the error in the URL hash, which only the browser sees
  const [hashError, setHashError] = useState<string | null>(null);
  useEffect(() => {
    setHashError(
      new URLSearchParams(window.location.hash.slice(1)).get("error_description"),
    );
  }, []);
  const linkError = params.get("error_description") ?? hashError;
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate(returnTo, { replace: true });
  }, [isLoading, isAuthenticated, navigate, returnTo]);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(t);
  }, [timeoutMs]);

  const error =
    linkError ??
    authError?.message ??
    (timedOut && !isAuthenticated ? missingState : null);

  if (error) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-6 px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-medium text-destructive">{errorTitle}</p>
          <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate("/", { replace: true })}
          >
            {returnHome}
          </Button>
          <Button onClick={() => void signin({ returnTo })}>{tryAgain}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col items-center justify-center gap-4">
      <Spinner className="size-8" aria-label={loading} />
      <p className="text-sm text-muted-foreground">{loading}</p>
    </div>
  );
}
