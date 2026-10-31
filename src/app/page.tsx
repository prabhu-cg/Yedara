import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeMenu } from "@/components/theme/theme-menu";
import { ToolCard } from "@/components/tools/tool-card";
import { Button } from "@/components/ui/button";
import { researchTools } from "@/config/tools";
import { siteConfig } from "@/config/site";

const FOOTER_LINKS = [
  { href: "/login", label: "Log in" },
  { href: "/signup", label: "Sign up" },
];

/** Same frame as Doxa's marketing site: a 1152px (`max-w-6xl`) column with 16/24px gutters. */
const FRAME = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className={`${FRAME} flex h-16 items-center justify-between`}>
          <Logo tagline markClassName="size-9" />
          <nav aria-label="Account" className="flex items-center gap-2">
            <ThemeMenu />
            <Button asChild variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero: plain page background, like Doxa's. */}
        <section className="bg-background">
          <div className={`${FRAME} py-16 text-center sm:py-20 lg:py-28`}>
            <p className="mb-4 text-[13px] font-semibold text-primary-text">{siteConfig.descriptor}</p>
            <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Research that goes from questions to opportunities, in one place.
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg text-balance text-muted-foreground">
              {siteConfig.description} Built for freelance designers, independent researchers, startups and small
              agencies.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Create your workspace <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted">
          <div className={`${FRAME} py-16 sm:py-20`}>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">Six tools, one research workflow</h2>
              <p className="mt-3 text-base text-muted-foreground">
                Projects and the Research Planner are live today. The remaining tools are being built one at a time.
              </p>
            </div>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {researchTools.map((tool) => (
                <li key={tool.slug} className="[&>a]:h-full [&>a]:p-6">
                  <ToolCard tool={tool} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className={`${FRAME} flex flex-col items-center gap-6 py-10 sm:flex-row sm:justify-between`}>
          <Logo markClassName="size-9" />
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} {siteConfig.name}. {siteConfig.tagline}
          </p>
          <nav className="flex items-center gap-5 text-sm" aria-label="Footer">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
