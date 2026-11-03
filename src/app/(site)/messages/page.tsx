import type { Metadata } from "next";
import Screen from "@/views/messages/page.tsx";

export const metadata: Metadata = { title: "Messages" };

export default function Page() {
  return <Screen />;
}
