import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils";

/**
 * Product previews are authored mockups of the real screens, filled with invented sample data.
 * Every one is wrapped in a figure that says so, and hidden from assistive tech: the caption and
 * the section copy carry the meaning.
 */
export function PreviewFigure({
  children,
  caption,
  className,
}: {
  children: React.ReactNode;
  caption: string;
  className?: string;
}) {
  return (
    <figure className={cn("m-0", className)}>
      <div aria-hidden="true">{children}</div>
      <figcaption className="mt-3 text-sm text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

/** A small app window: the quiet frame every preview sits in. */
export function AppWindow({
  title,
  children,
  className,
  sidebar,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  sidebar?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border-strong bg-card shadow-[0_2px_4px_-1px_#1010140f,0_18px_40px_-14px_#10101433]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted px-3.5 py-2.5">
        <LogoMark className="size-4" />
        <span className="truncate text-xs font-semibold text-foreground">{title}</span>
        <span className="ml-auto shrink-0 rounded-full bg-card px-2 py-0.5 whitespace-nowrap text-xs font-semibold text-muted-foreground ring-1 ring-border">
          Sample data
        </span>
      </div>
      <div className="flex">
        {sidebar}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/** An observation reference, the thing that travels between modules. */
export function ObsChip({ id, hot, className }: { id: string; hot?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md px-1.5 text-xs font-bold tabular-nums",
        hot ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary-text",
        className,
      )}
    >
      {id}
    </span>
  );
}

export function Tag({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: "muted" | "primary" | "success" | "warning" | "outline";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] items-center rounded-full px-2 text-xs font-semibold whitespace-nowrap",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "primary" && "bg-primary-soft text-primary-text",
        tone === "success" && "bg-success-soft text-success",
        tone === "warning" && "bg-warning-soft text-warning",
        tone === "outline" && "border border-border-strong text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
