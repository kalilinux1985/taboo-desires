import type { Metadata } from "next";
import Screen from "@/views/my-listings/page.tsx";

export const metadata: Metadata = { title: "My listings" };

export default function Page() {
  return <Screen />;
}
