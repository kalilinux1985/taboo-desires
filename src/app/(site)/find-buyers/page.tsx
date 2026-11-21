import type { Metadata } from "next";
import FindMembers from "@/views/members/find-members.tsx";

export const metadata: Metadata = { title: "Find Buyers" };

export default function Page() {
  return <FindMembers accountType="buyer" />;
}
