"use client";

import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider as ReactQueryClientProvider,
} from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Live updates refresh data when it changes; this only limits refetches on focus/remount
        staleTime: 30_000,
        // Private photos use signed URLs valid for 6 hours; refresh well before they expire
        refetchInterval: 60 * 60 * 1000,
      },
    },
  });
}

export function QueryClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // One client per browser tab (and per server render, so requests never share data)
  const [queryClient] = useState(makeQueryClient);
  return (
    <ReactQueryClientProvider client={queryClient}>
      {children}
    </ReactQueryClientProvider>
  );
}
