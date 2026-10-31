import { AuthAside, AuthFormLogo } from "@/components/auth/auth-aside";
import { ThemeMenu } from "@/components/theme/theme-menu";

/** Two columns from `lg`: the brand panel, then the form on the Oat ground. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-1">
      <AuthAside />
      <main className="relative flex flex-1 flex-col items-center justify-center bg-muted px-6 py-8 sm:py-12">
        <ThemeMenu className="absolute top-4 right-4" />
        <div className="w-full max-w-sm">
          <AuthFormLogo />
          {children}
        </div>
      </main>
    </div>
  );
}
