import { useBackendAuth, useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";

/** Signed-in user's account type and permissions. undefined while loading, null when signed out. */
export function useAccess() {
  const { isAuthenticated } = useBackendAuth();
  return useQuery(api.users.myAccess, isAuthenticated ? {} : "skip") ?? (isAuthenticated ? undefined : null);
}
