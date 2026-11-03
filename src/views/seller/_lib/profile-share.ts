import { toast } from "sonner";

export const profileUrl = (userId: string) => `${window.location.origin}/seller/${userId}`;

export async function copyProfileLink(userId: string) {
  await navigator.clipboard.writeText(profileUrl(userId));
  toast.success("Profile link copied");
}
