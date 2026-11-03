import { useAuth } from "@/components/providers/auth.tsx";

export { useAuth };

/** The signed-in Supabase Auth user, or null. */
export function useUser() {
  return useAuth().user;
}
