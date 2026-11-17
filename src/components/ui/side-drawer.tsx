"use client";

import * as React from "react";
import { Dialog as DrawerPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** 448px by default, 576px (`md`), 768px (`lg`); always full width below `sm`. */
const SIZES = {
  sm: "sm:w-[28rem]",
  md: "sm:w-[36rem]",
  lg: "sm:w-[48rem]",
} as const;

export type DrawerSize = keyof typeof SIZES;

/**
 * The shared drawer chrome (Doxa's Drawer): chrome on the desk ground, content on paper, hairlines between.
 * A 20px rounded left edge, a hairline, the drawer shadow over a flat 40% scrim (no blur). The header is a
 * desk bar with the title in Newsreader 24px (at most two lines), a 14px muted description and a 36px outlined
 * pill close. The body is paper. Form actions marked `.form-actions` become a desk bar with a hairline at the
 * foot (see globals.css). The body has no bottom padding, so that bar is flush with the panel edge by plain layout. Slides in over 220ms and out over 180ms, the scrim fades 180ms in and 150ms out.
 * The panel takes focus itself when it opens, so it carries `outline-none`.
 * Must be rendered inside a Radix Dialog root.
 */
export function DrawerShell({
  title,
  description,
  size = "md",
  children,
}: {
  title: string;
  description?: string;
  size?: DrawerSize;
  children: React.ReactNode;
}) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-[180ms]" />
      <DrawerPrimitive.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col overflow-hidden border-l border-border bg-background shadow-drawer outline-none sm:rounded-l-card",
          "ease-out data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-[180ms] data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-[220ms]",
          SIZES[size],
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border bg-surface px-5 py-6 sm:px-8">
          <div className="min-w-0 space-y-1.5">
            <DrawerPrimitive.Title className="font-display line-clamp-2 text-2xl leading-tight [overflow-wrap:anywhere]">{title}</DrawerPrimitive.Title>
            {description ? (
              <DrawerPrimitive.Description className="text-sm leading-6 text-muted-foreground">{description}</DrawerPrimitive.Description>
            ) : (
              <DrawerPrimitive.Description className="sr-only">{title}</DrawerPrimitive.Description>
            )}
          </div>
          <DrawerPrimitive.Close className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border-strong bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none">
            <X aria-hidden className="size-4" />
            <span className="sr-only">Close</span>
          </DrawerPrimitive.Close>
        </header>
        <div
          data-drawer-body
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-6 sm:px-8 sm:pt-8 [&>[role=group]]:rounded-none [&>[role=group]]:border-0 [&>[role=group]]:bg-transparent [&>[role=group]]:p-0 [&>form]:flex [&>form]:min-h-full [&>form]:flex-1 [&>form]:flex-col [&>form]:rounded-none [&>form]:border-0 [&>form]:bg-transparent [&>form]:p-0 [&>form:not(:has(.form-actions))]:pb-6 sm:[&>form:not(:has(.form-actions))]:pb-8 [&>:not(form):last-child]:mb-6 sm:[&>:not(form):last-child]:mb-8"
        >
          {children}
        </div>
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  );
}

/**
 * A right-hand drawer that slides in from the right and out again. It is state-driven (unlike
 * `RouteDrawer`, which is a route), for forms that live inside a workspace and must not lose its
 * place. Forms placed in it drop their own card chrome: the drawer is the container.
 */
export function SideDrawer({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: DrawerSize;
  children: React.ReactNode;
}) {
  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DrawerShell title={title} description={description} size={size}>
        {children}
      </DrawerShell>
    </DrawerPrimitive.Root>
  );
}
