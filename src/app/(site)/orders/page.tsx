import type { Metadata } from "next";
import Screen from "@/views/orders/page.tsx";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return <Screen />;
}
