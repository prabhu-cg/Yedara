import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Every button is a pill. 40px default, 36px sm, 28px xs, 48px lg; 14px semibold. One filled primary per view. */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent text-sm font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "bg-muted text-foreground hover:bg-border",
        outline: "border-border-strong bg-background text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        destructive: "border-border-strong bg-background text-destructive hover:bg-destructive-soft",
        link: "text-primary-text underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 px-2.5 text-xs",
        sm: "h-9 px-3.5 text-[13px]",
        lg: "h-12 px-6",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
