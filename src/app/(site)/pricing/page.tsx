import type { Metadata } from "next";
import Screen from "@/views/pricing/page.tsx";

export const metadata: Metadata = { title: "Go Pro" };

export default function Page() {
  return <Screen />;
}
