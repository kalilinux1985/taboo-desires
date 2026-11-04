import { Suspense, type ReactNode } from "react";
import AppLayout from "@/components/app-layout.tsx";

/** Header, footer and age gate around every page except the auth redirects. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayout>
      {/* Screens read the query string, which is only known in the browser */}
      <Suspense>{children}</Suspense>
    </AppLayout>
  );
}
