"use client";

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-[120ms] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-[180ms]" />
      <AlertDialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-card border border-border bg-background shadow-raised outline-none",
          "ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.97] data-[state=closed]:duration-[120ms] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:duration-[180ms]",
          className,
        )}
        // Like the drawer, the panel takes focus itself, so Cancel isn't left wearing a focus ring that reads as
        // "selected" the moment a dialog opens. Tab still reaches Cancel first, and Escape still closes.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.target as HTMLElement).focus();
        }}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2 px-6 pt-6 pb-6", className)} {...props} />;
}
function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 border-t border-border bg-surface px-6 py-4 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}
function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title className={cn("font-display text-xl leading-tight", className)} {...props} />;
}
function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  );
}
function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  // Dialogs only interrupt for destructive confirmations, so the action is the outline button with red text.
  return <AlertDialogPrimitive.Action className={cn(buttonVariants({ variant: "destructive" }), className)} {...props} />;
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
};
