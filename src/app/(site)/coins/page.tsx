import type { Metadata } from "next";
import Screen from "@/views/coins/page.tsx";

export const metadata: Metadata = { title: "Taboo Coins" };

export default function Page() {
  return <Screen />;
}
