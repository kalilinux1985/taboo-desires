import type { Metadata } from "next";
import Screen from "@/views/auctions/page.tsx";

export const metadata: Metadata = { title: "Auctions" };

export default function Page() {
  return <Screen />;
}
