import { cn } from "@/lib/utils";

/** The page column shared by every marketing section. */
export const FRAME = "mx-auto w-full max-w-[1152px] px-5 sm:px-6 lg:px-8";

export function Section({
  children,
  className,
  tone = "paper",
  id,
  labelledBy,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "paper" | "sand" | "charcoal";
  id?: string;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        "scroll-mt-20",
        tone === "sand" && "border-y border-border bg-muted",
        tone === "charcoal" && "on-charcoal bg-charcoal text-charcoal-foreground",
        className,
      )}
    >
      <div className={cn(FRAME, "py-20 sm:py-28")}>{children}</div>
    </section>
  );
}

/** Display heading for a section. Weight and scale carry the hierarchy; there is no eyebrow. */
export function SectionHeading({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      id={id}
      className={cn("text-[clamp(1.875rem,4.2vw,3rem)] leading-[1.08] font-extrabold tracking-[-0.03em]", className)}
    >
      {children}
    </h2>
  );
}

export function Lede({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("max-w-[60ch] text-lg leading-relaxed text-muted-foreground", className)}>{children}</p>;
}
