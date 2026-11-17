"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { FRAME } from "@/components/marketing/frame";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { ThemeMenu } from "@/components/theme/theme-menu";
import { PRIMARY_NAV } from "@/config/marketing";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  // The menu is open for one page only, so navigating closes it without an effect.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (next: boolean) => setOpenPath(next ? pathname : null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpenPath(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const linkClass = (href: string) =>
    cn(
      "rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
      pathname === href && "bg-accent font-semibold text-accent-foreground hover:bg-accent hover:text-accent-foreground",
    );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className={cn(FRAME, "flex h-16 items-center justify-between gap-4")}>
        <Logo markClassName="size-8" className="text-base" />

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(item.href)}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeMenu />
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Start free</Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeMenu />
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </Button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Primary" className="border-t border-border bg-background md:hidden">
          <ul className={cn(FRAME, "flex flex-col py-3")}>
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="block rounded-full px-3.5 py-3 text-lg font-medium aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-4">
              <Button asChild variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Start free</Link>
              </Button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
