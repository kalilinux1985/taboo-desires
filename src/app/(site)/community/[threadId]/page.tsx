import type { Metadata } from "next";
import Screen from "@/views/community/thread/page.tsx";

export const metadata: Metadata = { title: "Community" };

export default function Page() {
  return <Screen />;
}
