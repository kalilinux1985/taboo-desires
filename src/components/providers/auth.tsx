import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/backend/client.ts";

export type AuthState = {
  session: Session | null;
  user: User | null;
  /** True until the stored session (if any) has been restored */
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  /** Opens the sign-in page, returning to `returnTo` (default: the current page) afterwards. */
  signin: (opts?: { returnTo?: string }) => Promise<void>;
  signout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** Supabase Auth session for the whole app (email + password and magic links). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error: e }) => {
        if (!active) return;
        if (e) setError(e);
        setSession(data.session);
        setIsLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setIsLoading(false);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setIsLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signin = useCallback(async (opts?: { returnTo?: string }) => {
    const here = `${window.location.pathname}${window.location.search}`;
    const returnTo = opts?.returnTo ?? here;
    if (window.location.pathname === "/signin") return;
    window.location.assign(`/signin?returnTo=${encodeURIComponent(returnTo)}`);
  }, []);

  const signout = useCallback(async () => {
    const { error: e } = await supabase.auth.signOut();
    if (e) setError(e);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isAuthenticated: !!session,
      error,
      signin,
      signout,
    }),
    [session, isLoading, error, signin, signout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("Wrap the app in <AuthProvider>");
  return ctx;
}
