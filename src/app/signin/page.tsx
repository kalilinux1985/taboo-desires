import { Suspense } from "react";
import type { Metadata } from "next";
import Screen from "@/views/auth/SignIn.tsx";

export const metadata: Metadata = { title: "Sign in" };

// Outside the site layout: no header, footer or age gate, just the two columns.
export default function Page() {
  return (
    <div>
      <Suspense>
        <Screen />
      </Suspense>
    </div>
  );
}
