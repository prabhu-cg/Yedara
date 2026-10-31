"use client";

import { useRouter } from "next/navigation";
import { PasswordForm } from "@/components/auth/password-form";

export function ResetPasswordForm() {
  const router = useRouter();
  return (
    <PasswordForm
      submitLabel="Update password"
      onSuccess={() => {
        router.replace("/dashboard");
        router.refresh();
      }}
    />
  );
}
