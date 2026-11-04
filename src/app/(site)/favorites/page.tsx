import type { Metadata } from "next";
import Screen from "@/views/favorites/page.tsx";

export const metadata: Metadata = { title: "Favorites" };

export default function Page() {
  return <Screen />;
}
