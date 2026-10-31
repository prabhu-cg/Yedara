import { AppShell } from "@/components/layout/app-shell";
import { displayName, getProfile, requireUser } from "@/lib/auth/dal";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Authoritative server-side session check (the proxy only does an optimistic one).
  const user = await requireUser();
  const profile = await getProfile();

  return (
    <AppShell name={displayName(profile, user.email)} email={user.email ?? ""}>
      {children}
    </AppShell>
  );
}
