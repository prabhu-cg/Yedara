import type { Metadata } from "next";
import { ProfileForm } from "@/components/auth/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const profile = await getProfile();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>This is how you appear in your workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm
          defaultValues={{
            fullName: profile?.full_name ?? "",
            jobTitle: profile?.job_title ?? "",
            company: profile?.company ?? "",
          }}
        />
      </CardContent>
    </Card>
  );
}
