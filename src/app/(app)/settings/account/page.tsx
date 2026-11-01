import type { Metadata } from "next";
import { PasswordForm } from "@/components/auth/password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>The address you use to log in.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-semibold [overflow-wrap:anywhere]">{user.email}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Choose a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm submitLabel="Change password" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            Account deletion isn&apos;t available yet.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
