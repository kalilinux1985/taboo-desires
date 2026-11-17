import { Suspense } from "react";
import type { Metadata } from "next";
import { Comfortaa, PT_Serif } from "next/font/google";
import Screen from "@/views/auth/SignIn.tsx";

export const metadata: Metadata = { title: "Sign in" };

/** Rounded sans of the wordmark, button and footnote; serif of the headings and fields. */
const rounded = Comfortaa({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-signin-rounded" });
const serif = PT_Serif({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-signin-serif" });

// Outside the site layout: no header, footer or age gate, just the two columns.
export default function Page() {
  return (
    <div className={`${rounded.variable} ${serif.variable}`}>
      <Suspense>
        <Screen />
      </Suspense>
    </div>
  );
}
