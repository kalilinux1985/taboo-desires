import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Playfair_Display } from "next/font/google";
import { DefaultProviders } from "@/components/providers/default.tsx";
import "../index.css";

const display = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});
const sans = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: {
    default: "Taboo Desires | Buy and sell worn intimates",
    template: "%s | Taboo Desires",
  },
  description:
    "An 18+ marketplace to buy and sell worn lingerie, panties, socks and custom requests. Zero commission for sellers.",
  icons: { icon: "/favicon.ico" },
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
      className={`dark ${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <DefaultProviders>{children}</DefaultProviders>
      </body>
    </html>
  );
}
