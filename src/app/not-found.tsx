import type { Metadata } from "next";
import NotFound from "@/views/NotFound.tsx";

export const metadata: Metadata = { title: "Page not found" };

export default function Page() {
  return <NotFound />;
}
