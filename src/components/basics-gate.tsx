"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@/lib/backend/react.tsx";
import { api } from "@/lib/backend/api.ts";
import { BASICS_ALLOWED, settingsPathFor } from "@/lib/settings.ts";

/**
 * New members (and anyone whose profile is missing them) must choose their
 * age, country and gender before using the site: every page sends them to
 * Settings until they have.
 */
export default function BasicsGate() {
  const me = useQuery(api.users.menu, {});
  const pathname = usePathname();
  const router = useRouter();
  const missing = (me?.missingBasics?.length ?? 0) > 0;
  useEffect(() => {
    if (!me || !missing) return;
    if (BASICS_ALLOWED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    router.replace(`${settingsPathFor(me.accountType)}?setup=1`);
  }, [me, missing, pathname, router]);
  return null;
}
