import type { Metadata } from "next";
import { profileFontVars } from "@/views/seller/_lib/fonts.ts";
import Screen from "@/views/legal/privacy.tsx";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Page() {
  return (
    <div className={profileFontVars}>
      <Screen />
    </div>
  );
}
