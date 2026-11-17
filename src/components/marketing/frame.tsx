import { cn } from "@/lib/utils";

/** The page column shared by every marketing section (1152px). */
export const FRAME = "mx-auto w-full max-w-[1152px] px-5 sm:px-6 lg:px-8";

/** Bands alternate: `desk` (the butter ground) and `paper` (white), separated by a hairline. */
export function Section({
  children,
  className,
  tone = "paper",
  id,
  labelledBy,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "paper" | "desk";
  id?: string;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("scroll-mt-20 border-t border-border", tone === "desk" ? "bg-surface" : "bg-background", className)}
    >
      <div className={cn(FRAME, "py-16 sm:py-20")}>{children}</div>
    </section>
  );
}

/** Section title: Newsreader (set by the One Heading Rule), 36px, 48px from `sm`. */
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
    <h2 id={id} className={cn("text-4xl leading-[1.1] sm:text-5xl", className)}>
      {children}
    </h2>
  );
}

export function Lede({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("max-w-[60ch] text-lg leading-relaxed text-muted-foreground", className)}>{children}</p>;
}
