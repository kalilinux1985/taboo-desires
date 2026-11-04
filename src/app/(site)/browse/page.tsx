import type { Metadata } from "next";
import Screen from "@/views/browse/page.tsx";

export const metadata: Metadata = { title: "Browse" };

export default function Page() {
  return <Screen />;
}
