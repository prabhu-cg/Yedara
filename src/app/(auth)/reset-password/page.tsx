import type { Metadata } from "next";
import { AuthCard, AuthLink } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  // The recovery link signs the user in via /auth/callback first.
  const user = await getUser();

  if (!user) {
    return (
      <AuthCard
        title="This link has expired"
        description="Password reset links can only be used once and expire quickly."
        footer={<AuthLink href="/forgot-password">Request a new link</AuthLink>}
      >
        <p className="text-sm text-muted-foreground">
          Request a new reset email and open the link in the same browser.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" description="Pick something you haven't used elsewhere.">
      <ResetPasswordForm />
    </AuthCard>
  );
}
