"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** Top bar with a slide-over navigation drawer, shown below the `lg` breakpoint. */
export function MobileHeader({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4 sm:px-6 lg:hidden">
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation menu" className="-ml-2">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent aria-describedby="mobile-nav-description">
            <div className="flex h-14 items-center border-b border-sidebar-border px-5">
              <SheetTitle asChild>
                <Logo href="/dashboard" />
              </SheetTitle>
              <SheetDescription id="mobile-nav-description" className="sr-only">
                Navigate between workspace areas
              </SheetDescription>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
        <Logo href="/dashboard" />
      </div>
      <UserMenu name={name} email={email} />
    </header>
  );
}
