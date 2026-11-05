import type { Metadata } from "next";
import Screen from "@/views/notifications/page.tsx";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return <Screen />;
}
