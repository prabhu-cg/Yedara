import Link from "next/link";
import { cn } from "@/lib/utils";

/** A row of mutually exclusive links (filter, layout) that lives in the URL and works without JS. */
export function Segmented({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <nav aria-label={label} className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-muted p-0.5">
      {children}
    </nav>
  );
}

export function SegmentLink({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      aria-current={current ? "true" : undefined}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        current ? "bg-background font-semibold text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
