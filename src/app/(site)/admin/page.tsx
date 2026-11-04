import type { Metadata } from "next";
import Screen from "@/views/admin/page.tsx";

export const metadata: Metadata = { title: "Admin" };

export default function Page() {
  return <Screen />;
}
