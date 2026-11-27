import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import { DefaultProviders } from "@/components/providers/default.tsx";
import "../index.css";

/** Plus Jakarta Sans: body text, buttons, fields, prices — everything that isn't a heading */
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-jakarta" });
/** Nurma (Cometype): the display face for the wordmark, page titles and member names */
const nurma = localFont({ src: "./fonts/Nurma-Regular.woff", variable: "--font-nurma", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Taboo Desires | Buy and sell worn intimates",
    template: "%s | Taboo Desires",
  },
  description:
    "An 18+ marketplace to buy and sell worn lingerie, panties, socks and custom requests. Zero commission for sellers.",
  icons: { icon: "/favicon.ico", apple: "/logo.png" },
  // Opens full screen from the iPhone home screen, which push notifications need
  appleWebApp: { capable: true, title: "Taboo Desires", statusBarStyle: "black" },
  // The site is already dark: ask dark-mode extensions (Dark Reader and
  // similar) not to recolor it, which darkens the violet backgrounds.
  other: { "darkreader-lock": "" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${sans.variable} ${nurma.variable}`}
    >
      <body>
        <DefaultProviders>{children}</DefaultProviders>
      </body>
    </html>
  );
}
