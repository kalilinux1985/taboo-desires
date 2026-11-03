import type { Metadata } from "next";
import { SellerPage as Screen } from "@/views/seller/page.tsx";

export const metadata: Metadata = { title: "Seller" };

export default function Page() {
  return <Screen />;
}
