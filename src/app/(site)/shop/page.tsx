import type { Metadata } from "next";
import { profileFontVars } from "@/views/seller/_lib/fonts.ts";
import { MyShopPage as Screen } from "@/views/seller/page.tsx";

export const metadata: Metadata = { title: "My shop" };

export default function Page() {
  return (
    <div className={profileFontVars}>
      <Screen />
    </div>
  );
}
