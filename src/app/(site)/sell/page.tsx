import type { Metadata } from "next";
import Screen from "@/views/sell/page.tsx";

export const metadata: Metadata = { title: "Sell an item" };

export default function Page() {
  return <Screen />;
}
