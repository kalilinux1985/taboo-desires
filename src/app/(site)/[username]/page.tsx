import type { Metadata } from "next";
import { profileFontVars } from "@/views/seller/_lib/fonts.ts";
import { UsernamePage as Screen } from "@/views/seller/page.tsx";

export const metadata: Metadata = { title: "Profile" };

/** A member's profile at /username. */
export default function Page() {
  return (
    <div className={profileFontVars}>
      <Screen />
    </div>
  );
}
