import type { Metadata } from "next";
import Screen from "@/views/settings/page.tsx";

export const metadata: Metadata = { title: "Seller settings" };

export default function Page() {
  return <Screen kind="seller" />;
}
