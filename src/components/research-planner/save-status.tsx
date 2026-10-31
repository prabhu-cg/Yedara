"use client";

import { Check, CircleAlert, LoaderCircle, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SaveStatus } from "@/hooks/use-autosave";
import { cn } from "@/lib/utils";

const COPY: Record<SaveStatus, string> = {
  idle: "All changes saved",
  dirty: "Unsaved changes…",
  saving: "Saving…",
  saved: "All changes saved",
  error: "Couldn't save",
};

/** Visible, screen-reader-friendly save status for the autosaving wizard. */
export function SaveStatusIndicator({
  status,
  error,
  onRetry,
}: {
  status: SaveStatus;
  error: string | null;
  onRetry: () => void;
}) {
  const Icon = status === "saving" ? LoaderCircle : status === "error" ? CircleAlert : status === "dirty" ? PenLine : Check;
  return (
    <div
      data-save-status={status}
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-1.5 text-sm", status === "error" ? "text-destructive" : "text-muted-foreground")}
    >
      <Icon aria-hidden className={cn("size-4", status === "saving" && "animate-spin")} />
      <span>{COPY[status]}</span>
      {status === "error" && (
        <>
          <span className="sr-only">{error}</span>
          <Button type="button" variant="link" size="sm" className="h-auto p-0 text-destructive" onClick={onRetry}>
            Retry
          </Button>
        </>
      )}
    </div>
  );
}
