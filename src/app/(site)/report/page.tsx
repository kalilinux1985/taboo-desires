import { Suspense } from "react";
import type { Metadata } from "next";
import { profileFontVars } from "@/views/seller/_lib/fonts.ts";
import Screen from "@/views/legal/report.tsx";

export const metadata: Metadata = { title: "Report Content" };

export default function Page() {
  return (
    <div className={profileFontVars}>
      <Suspense>
        <Screen />
      </Suspense>
    </div>
  );
}
