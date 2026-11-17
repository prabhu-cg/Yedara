import Link from "next/link";
import { cn } from "@/lib/utils";

/** A row of mutually exclusive links (filter, layout) that lives in the URL and works without JS. */
export function Segmented({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <nav aria-label={label} className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-border bg-background p-0.5">
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
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/40",
        // Selection is butter (a tint with an amber hairline, so it reads on the paper track); hover is sand.
        current
          ? "bg-accent font-semibold text-accent-foreground ring-1 ring-primary/50 ring-inset"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
