import * as React from "react";
import { cn } from "@/lib/utils";

/** 40px, 8px radius, control-border outline. 16px on touch screens so iOS doesn't zoom on focus. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-1 text-base text-foreground transition-colors placeholder:text-muted-foreground md:text-sm",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
