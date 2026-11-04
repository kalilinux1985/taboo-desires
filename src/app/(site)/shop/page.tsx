import type { Metadata } from "next";
import { MyShopPage as Screen } from "@/views/seller/page.tsx";

export const metadata: Metadata = { title: "My shop" };

export default function Page() {
  return <Screen />;
}
