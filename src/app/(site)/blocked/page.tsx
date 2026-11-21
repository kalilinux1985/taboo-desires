import type { Metadata } from "next";
import BlockedUsers from "@/views/members/blocked-users.tsx";

export const metadata: Metadata = { title: "Blocked Users" };

export default function Page() {
  return <BlockedUsers />;
}
