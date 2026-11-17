import type { Metadata } from "next";
import { profileFontVars } from "@/views/seller/_lib/fonts.ts";
import Screen from "@/views/legal/copyright.tsx";

export const metadata: Metadata = { title: "Copyright and DMCA" };

export default function Page() {
  return (
    <div className={profileFontVars}>
      <Screen />
    </div>
  );
}
