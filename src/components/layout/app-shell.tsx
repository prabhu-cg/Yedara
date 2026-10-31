import { Logo } from "@/components/layout/logo";
import { MobileHeader } from "@/components/layout/mobile-header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeMenu } from "@/components/theme/theme-menu";

export function AppShell({
  name,
  email,
  children,
}: {
  name: string;
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-background px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Logo href="/dashboard" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <SidebarNav />
        </div>
        <div className="flex items-center gap-1 border-t border-sidebar-border p-3">
          <UserMenu name={name} email={email} showDetails className="min-w-0 flex-1" />
          <ThemeMenu className="shrink-0" />
        </div>
      </aside>

      <div className="lg:pl-72">
        <MobileHeader name={name} email={email} />
        <main id="main-content" tabIndex={-1} className="outline-none">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
