"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetTitle = SheetPrimitive.Title;
const SheetDescription = SheetPrimitive.Description;

/** A left-anchored drawer used for mobile and tablet navigation. */
function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-[180ms]" />
      <SheetPrimitive.Content
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-[min(20rem,85vw)] flex-col rounded-r-card border-r border-sidebar-border bg-sidebar shadow-drawer outline-none ease-out data-[state=closed]:duration-[180ms] data-[state=open]:duration-[220ms]",
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-full border border-border-strong bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none">
          <X className="size-4" />
          <span className="sr-only">Close menu</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription };
