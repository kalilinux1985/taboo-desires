import type { Metadata } from "next";
import { profileFontVars } from "@/views/seller/_lib/fonts.ts";
import Screen from "@/views/legal/terms.tsx";

export const metadata: Metadata = { title: "Terms of Service" };

export default function Page() {
  return (
    <div className={profileFontVars}>
      <Screen />
    </div>
  );
}
