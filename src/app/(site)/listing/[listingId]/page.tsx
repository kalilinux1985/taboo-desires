import type { Metadata } from "next";
import { profileFontVars } from "@/views/seller/_lib/fonts.ts";
import Screen from "@/views/listing/page.tsx";

export const metadata: Metadata = { title: "Listing" };

export default function Page() {
  return (
    <div className={profileFontVars}>
      <Screen />
    </div>
  );
}
