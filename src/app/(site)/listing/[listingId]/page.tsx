import type { Metadata } from "next";
import Screen from "@/views/listing/page.tsx";

export const metadata: Metadata = { title: "Listing" };

export default function Page() {
  return <Screen />;
}
