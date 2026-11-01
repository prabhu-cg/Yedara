"use client";

import * as React from "react";
import { Dialog as DrawerPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  /** Short forms: one statement, pasted notes, a file. */
  md: "w-[min(40rem,100vw)]",
  /** Long forms that need room: insights with evidence pickers. */
  lg: "w-[min(60rem,100vw)]",
} as const;

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
  size?: keyof typeof SIZES;
  children: React.ReactNode;
}) {
  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DrawerPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex h-full flex-col border-l border-border bg-background shadow-raised outline-none duration-300 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
            SIZES[size],
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
            <div className="min-w-0 space-y-1">
              <DrawerPrimitive.Title className="text-xl leading-tight font-bold [overflow-wrap:anywhere]">{title}</DrawerPrimitive.Title>
              {description ? (
                <DrawerPrimitive.Description className="text-sm leading-6 text-muted-foreground">{description}</DrawerPrimitive.Description>
              ) : (
                <DrawerPrimitive.Description className="sr-only">{title}</DrawerPrimitive.Description>
              )}
            </div>
            <DrawerPrimitive.Close className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              <X aria-hidden className="size-4" />
              <span className="sr-only">Close</span>
            </DrawerPrimitive.Close>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 [&>[role=group]]:rounded-none [&>[role=group]]:border-0 [&>[role=group]]:bg-transparent [&>[role=group]]:p-0 [&>form]:rounded-none [&>form]:border-0 [&>form]:bg-transparent [&>form]:p-0">
            {children}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
