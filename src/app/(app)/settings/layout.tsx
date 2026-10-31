import { PageHeader } from "@/components/layout/page-header";
import { SettingsTabs } from "@/components/layout/settings-tabs";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <>
      <PageHeader title="Settings" description="Manage your profile and account." className="mb-6" />
      <SettingsTabs />
      <div className="max-w-2xl">{children}</div>
    </>
  );
}
