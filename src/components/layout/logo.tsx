import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 rounded-md font-bold text-foreground", className)}
    >
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-lg bg-primary text-base font-extrabold text-primary-foreground"
      >
        Y
      </span>
      <span className="text-lg tracking-tight">{siteConfig.name}</span>
    </Link>
  );
}
