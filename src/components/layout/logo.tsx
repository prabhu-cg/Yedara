import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** The mark with the product name, and optionally the tagline beneath it. */
export function Logo({
  href = "/",
  className,
  tagline = false,
  markClassName = "size-8",
}: {
  href?: string;
  className?: string;
  tagline?: boolean;
  markClassName?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${siteConfig.name} home`}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg font-bold text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      <LogoMark className={markClassName} />
      <span className="flex flex-col leading-tight">
        <span className="text-[15px] tracking-tight">{siteConfig.name}</span>
        {tagline && <span className="text-xs font-medium text-muted-foreground">{siteConfig.tagline}</span>}
      </span>
    </Link>
  );
}
