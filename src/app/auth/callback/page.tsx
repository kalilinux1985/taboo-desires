import { Suspense } from "react";
import type { Metadata } from "next";
import AuthCallback from "@/views/auth/Callback.tsx";

export const metadata: Metadata = { title: "Signing in" };

/** Where sign-in email links land. */
export default function Page() {
  return (
    <Suspense>
      <AuthCallback />
    </Suspense>
  );
}
