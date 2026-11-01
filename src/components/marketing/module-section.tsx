import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { ModulePreview } from "@/components/marketing/module-preview";
import { Badge } from "@/components/ui/badge";
import type { MarketingModule } from "@/config/marketing";
import { cn } from "@/lib/utils";

/**
 * One module: its name, what it promises, specifics and a product preview.
 * `variant="summary"` is the homepage version, `variant="full"` the features page.
 */
export function ModuleSection({
  module: m,
  index,
  variant,
}: {
  module: MarketingModule;
  index: number;
  variant: "summary" | "full";
}) {
  const Icon = m.icon;
  const flip = index % 2 === 1;
  const items = variant === "full" ? m.details : m.points;
  const headingId = `${m.slug}-heading`;

  return (
    <article
      id={m.slug}
      aria-labelledby={headingId}
      className={cn(
        "grid scroll-mt-24 grid-cols-[minmax(0,1fr)] items-center gap-10 border-t border-border py-14 first:border-t-0 first:pt-0 lg:grid-cols-12 lg:gap-14 lg:py-20",
      )}
    >
      <div className={cn("min-w-0 lg:col-span-5", flip && "lg:order-2")}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-charcoal text-charcoal-foreground">
            <Icon className="size-5" aria-hidden />
          </span>
          <h3 id={headingId} className="text-[1.75rem] leading-tight font-extrabold tracking-[-0.02em]">
            {m.name}
          </h3>
          {m.status === "in-development" && <Badge variant="default">In development</Badge>}
        </div>
        <p className="mt-5 text-xl leading-snug font-bold">{m.headline}</p>
        <p className="mt-3 max-w-[52ch] text-muted-foreground">{m.summary}</p>
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-[15px] leading-snug">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary-text" strokeWidth={3} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        {variant === "summary" && (
          <Link
            href={`/features#${m.slug}`}
            className="mt-7 inline-flex items-center gap-1.5 rounded-md text-[15px] font-bold text-primary-text underline-offset-4 hover:underline"
          >
            More about {m.name} <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      <div className={cn("min-w-0 lg:col-span-7", flip && "lg:order-1")}>
        <ModulePreview slug={m.slug} name={m.name} concept={m.status === "in-development"} />
      </div>
    </article>
  );
}
