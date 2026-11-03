import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordPage from "@/views/auth/ResetPassword.tsx";

export const metadata: Metadata = { title: "Choose a new password" };

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordPage />
    </Suspense>
  );
}
