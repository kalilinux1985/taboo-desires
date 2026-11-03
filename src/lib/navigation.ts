"use client";

// Small helpers over next/navigation for the app's screens:
//   useNavigate()      navigate("/path") or navigate("/path", { replace: true })
//   useSearchParams()  [params, setParams]: read and update the query string

import { useCallback } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";

type NavigateOptions = { replace?: boolean };

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to: string, options?: NavigateOptions) => {
      if (options?.replace) router.replace(to);
      else router.push(to);
    },
    [router],
  );
}

type ParamsInit = URLSearchParams | Record<string, string>;

export function useSearchParams(): [
  URLSearchParams,
  (next: ParamsInit, options?: NavigateOptions) => void,
] {
  const router = useRouter();
  const pathname = usePathname();
  const current = useNextSearchParams();
  const params = new URLSearchParams(current?.toString() ?? "");
  const setParams = useCallback(
    (next: ParamsInit, options?: NavigateOptions) => {
      const query = new URLSearchParams(next).toString();
      const url = query ? `${pathname}?${query}` : pathname;
      if (options?.replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [router, pathname],
  );
  return [params, setParams];
}
