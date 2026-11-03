import type { Metadata } from "next";
import Screen from "@/views/customs/page.tsx";

export const metadata: Metadata = { title: "Custom requests" };

export default function Page() {
  return <Screen />;
}
