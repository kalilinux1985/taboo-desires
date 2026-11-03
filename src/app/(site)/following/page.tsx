import type { Metadata } from "next";
import Screen from "@/views/feed/page.tsx";

export const metadata: Metadata = { title: "Following" };

export default function Page() {
  return <Screen />;
}
