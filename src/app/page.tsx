import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ToolCard } from "@/components/tools/tool-card";
import { Button } from "@/components/ui/button";
import { researchTools } from "@/config/tools";
import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Account" className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 lg:px-8">
          <p className="mb-4 text-sm font-semibold text-primary">{siteConfig.tagline}</p>
          <h1 className="max-w-3xl text-4xl font-extrabold text-balance sm:text-5xl sm:leading-[1.1]">
            Research that goes from questions to opportunities, in one place.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            {siteConfig.description} Built for freelance designers, independent researchers,
            startups and small agencies.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">
                Create your workspace <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </section>

        <section className="border-y border-border bg-secondary">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold">Six tools, one research workflow</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Projects are live today. The research tools are being built one at a time.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {researchTools.map((tool) => (
                <li key={tool.slug} className="[&>a]:h-full [&>a]:bg-background">
                  <ToolCard tool={tool} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8">
        © {new Date().getFullYear()} {siteConfig.name}
      </footer>
    </div>
  );
}
