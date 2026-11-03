// Drop-in replacements for the convex/react hooks the app used, backed by
// TanStack Query, the `api` Edge Function and Supabase Realtime.
//
// Live updates: every query response lists the tables it read. Each write in
// the database broadcasts the table name on the "db-changes" topic, and the
// browser refetches the queries that read it. A mutation also refreshes the
// caller's own affected queries as soon as it returns.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  useInfiniteQuery,
  useQuery as useTanstackQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth.tsx";
import type { FunctionKind } from "@/backend/core/functions.ts";
import {
  BackendError,
  callBackend,
  supabase,
  type CallResult,
} from "./client.ts";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  PaginationResult,
} from "./types.ts";

export type { FunctionReturnType } from "./types.ts";

type QueryRef = FunctionReference<"query", any, any>;
type MutationRef = FunctionReference<Exclude<FunctionKind, "query">, any, any>;
/** Args can be left out when the function takes none, like convex/react. */
type OptionalArgs<F> = keyof FunctionArgs<F> extends never
  ? [args?: FunctionArgs<F>]
  : [args: FunctionArgs<F>];

const KEY = "backend";

// ---------------------------------------------------------------------------
// Auth + provider
// ---------------------------------------------------------------------------

type BackendState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Changes when the signed-in user changes, so cached results never leak between accounts. */
  authKey: string;
  call<T>(name: string, args: unknown): Promise<CallResult<T>>;
};

const BackendContext = createContext<BackendState | null>(null);

export function BackendProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const token = auth.session?.access_token ?? null;
  // Read the latest token at call time; token refreshes don't refetch anything
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const authKey = token ? (auth.user?.id ?? "user") : "anonymous";
  const isLoading = auth.isLoading;
  const queryClient = useQueryClient();

  useEffect(() => subscribeToChanges(queryClient), [queryClient]);

  // Make sure the signed-in person has a profile row (creates it on first
  // sign-in, or links an existing account with the same verified email)
  const syncedFor = useRef<string | null>(null);
  useEffect(() => {
    if (authKey === "anonymous" || syncedFor.current === authKey) return;
    syncedFor.current = authKey;
    callBackend("users.updateCurrentUser", {}, tokenRef.current)
      .then((result) => invalidateTables(queryClient, result.writes))
      .catch((e: unknown) => {
        syncedFor.current = null;
        console.error("Could not set up your account", e);
      });
  }, [authKey, queryClient]);

  const value = useMemo<BackendState>(
    () => ({
      isLoading,
      isAuthenticated: !!token,
      authKey,
      call: (name, args) => callBackend(name, args, tokenRef.current),
    }),
    // token is in deps only through isAuthenticated; renewals keep the same authKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoading, !!token, authKey],
  );

  return (
    <BackendContext.Provider value={value}>{children}</BackendContext.Provider>
  );
}

function useBackend(): BackendState {
  const ctx = useContext(BackendContext);
  if (!ctx) throw new Error("Wrap the app in <BackendProvider>");
  return ctx;
}

/** Same shape as convex/react's useConvexAuth. */
export function useBackendAuth() {
  const { isLoading, isAuthenticated } = useBackend();
  return { isLoading, isAuthenticated };
}

export function Authenticated({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useBackendAuth();
  return !isLoading && isAuthenticated ? <>{children}</> : null;
}

export function Unauthenticated({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useBackendAuth();
  return !isLoading && !isAuthenticated ? <>{children}</> : null;
}

export function AuthLoading({ children }: { children: ReactNode }) {
  return useBackendAuth().isLoading ? <>{children}</> : null;
}

// ---------------------------------------------------------------------------
// Live updates
// ---------------------------------------------------------------------------

type CachedData = CallResult | { pages: CallResult[] } | undefined;

function readsOf(data: CachedData): string[] {
  if (!data) return [];
  if ("pages" in data) return data.pages.flatMap((p) => p.reads);
  return data.reads;
}

/** Refetches every cached backend query that read one of `tables`. */
function invalidateTables(
  queryClient: QueryClient,
  tables: Iterable<string>,
): Promise<void> {
  const changed = new Set(tables);
  if (changed.size === 0) return Promise.resolve();
  return queryClient.invalidateQueries({
    queryKey: [KEY],
    predicate: (query) =>
      readsOf(query.state.data as CachedData).some((t) => changed.has(t)),
  });
}

function subscribeToChanges(queryClient: QueryClient) {
  const pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const channel = supabase
    .channel("db-changes")
    .on("broadcast", { event: "change" }, ({ payload }) => {
      const table = (payload as { table?: unknown })?.table;
      if (typeof table !== "string") return;
      pending.add(table);
      // Batch bursts of notifications into one round of refetches
      timer ??= setTimeout(() => {
        timer = null;
        void invalidateTables(queryClient, new Set(pending));
        pending.clear();
      }, 75);
    })
    .subscribe((status) => {
      // After a reconnect we may have missed changes: refresh everything once
      if (status === "SUBSCRIBED")
        void queryClient.invalidateQueries({ queryKey: [KEY] });
    });
  return () => {
    if (timer) clearTimeout(timer);
    void supabase.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

const isClientError = (error: unknown) =>
  error instanceof BackendError && error.status >= 400 && error.status < 500;
const retry = (count: number, error: unknown) =>
  count < 2 && !isClientError(error);
/**
 * Like Convex, a query the server rejects (bad arguments, not allowed) throws
 * during render. Network hiccups and expired sessions don't: the query keeps
 * retrying in the background instead of taking the page down.
 */
const throwOnError = (error: unknown) =>
  isClientError(error) &&
  (error as BackendError).data.code !== "UNAUTHENTICATED";

/**
 * Like convex/react's useQuery: `undefined` while loading, then the result,
 * kept fresh as the data changes. Pass "skip" to not run it.
 */
export function useQuery<F extends QueryRef>(
  ref: F,
  ...rest: OptionalArgs<F> | ["skip"]
): FunctionReturnType<F> | undefined {
  const backend = useBackend();
  const skip = rest[0] === "skip";
  const args = skip ? {} : (rest[0] ?? {});
  const query = useTanstackQuery({
    queryKey: [KEY, ref.__name, backend.authKey, args],
    queryFn: () => backend.call<FunctionReturnType<F>>(ref.__name, args),
    enabled: !skip && !backend.isLoading,
    select: (data: CallResult<FunctionReturnType<F>>) => data.value,
    throwOnError,
    retry,
  });
  return skip ? undefined : query.data;
}

type PageOf<F> =
  FunctionReturnType<F> extends PaginationResult<infer T> ? T : never;
type ArgsWithoutPagination<F> = Omit<FunctionArgs<F>, "paginationOpts">;
type PaginatedRef = FunctionReference<
  "query",
  { paginationOpts: unknown },
  PaginationResult<unknown>
>;

export type PaginationStatus =
  | "LoadingFirstPage"
  | "CanLoadMore"
  | "LoadingMore"
  | "Exhausted";

/** Like convex/react's usePaginatedQuery. */
export function usePaginatedQuery<F extends PaginatedRef>(
  ref: F,
  args: ArgsWithoutPagination<F> | "skip",
  options: { initialNumItems: number },
): {
  results: PageOf<F>[];
  status: PaginationStatus;
  isLoading: boolean;
  loadMore: (numItems: number) => void;
} {
  const backend = useBackend();
  const skip = args === "skip";
  const baseArgs = skip ? {} : args;
  const nextPageSize = useRef(options.initialNumItems);
  type Page = CallResult<PaginationResult<PageOf<F>>>;

  const query = useInfiniteQuery({
    queryKey: [
      KEY,
      ref.__name,
      backend.authKey,
      baseArgs,
      "paginated",
      options.initialNumItems,
    ],
    queryFn: ({ pageParam }) =>
      backend.call<PaginationResult<PageOf<F>>>(ref.__name, {
        ...baseArgs,
        paginationOpts: pageParam,
      }),
    initialPageParam: {
      numItems: options.initialNumItems,
      cursor: null as string | null,
    },
    getNextPageParam: (last: Page) =>
      last.value.isDone
        ? undefined
        : { numItems: nextPageSize.current, cursor: last.value.continueCursor },
    enabled: !skip && !backend.isLoading,
    throwOnError,
    retry,
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const loadMore = useCallback(
    (numItems: number) => {
      if (!hasNextPage || isFetchingNextPage) return;
      nextPageSize.current = numItems;
      void fetchNextPage();
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const results = useMemo(
    () => query.data?.pages.flatMap((p) => p.value.page) ?? [],
    [query.data],
  );
  const status: PaginationStatus =
    skip || !query.data
      ? "LoadingFirstPage"
      : isFetchingNextPage
        ? "LoadingMore"
        : hasNextPage
          ? "CanLoadMore"
          : "Exhausted";
  return {
    results,
    status,
    isLoading: status === "LoadingFirstPage" || status === "LoadingMore",
    loadMore,
  };
}

/**
 * Like convex/react's useMutation: returns a stable async function. As with
 * Convex, by the time it resolves the caller's on-screen queries that read the
 * changed tables have been refetched.
 */
export function useMutation<F extends MutationRef>(
  ref: F,
): (...args: OptionalArgs<F>) => Promise<FunctionReturnType<F>> {
  const backend = useBackend();
  const queryClient = useQueryClient();
  return useCallback(
    async (...args: OptionalArgs<F>) => {
      const result = await backend.call<FunctionReturnType<F>>(
        ref.__name,
        args[0] ?? {},
      );
      await invalidateTables(queryClient, result.writes);
      return result.value;
    },
    [backend, queryClient, ref],
  );
}
