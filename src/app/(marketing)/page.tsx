import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FRAME, Section, SectionHeading, Lede } from "@/components/marketing/frame";
import { LaptopMockup } from "@/components/marketing/mockups/laptop";
import { PointerHighlight } from "@/components/marketing/pointer-highlight";
import { ModuleSection } from "@/components/marketing/module-section";
import {
  ConnectedWorkflow,
  Differentiators,
  FaqSection,
  FinalCta,
  PricingPreview,
  WorkflowBand,
} from "@/components/marketing/sections";
import { Button } from "@/components/ui/button";
import { MODULES } from "@/config/marketing";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name}: UX research workspace for better insights` },
  description:
    "Yedara is a connected UX research workspace. Plan research, understand users, analyse competitors, synthesise findings and identify opportunities, with evidence attached all the way through.",
  alternates: { canonical: "/" },
  openGraph: {
    title: `${siteConfig.name}: Better insights. Stronger decisions.`,
    description: "A connected UX research workspace where evidence stays attached from raw notes to decisions.",
    url: "/",
  },
};

export default function HomePage() {
  return (
    <>
      <section aria-labelledby="hero-heading" className="hero-aura overflow-hidden bg-background">
        <div className={`${FRAME} pt-14 pb-20 text-center sm:pt-20 sm:pb-28`}>
          <div className="rise mx-auto max-w-4xl">
            <Link
              href="/features"
              className="group inline-flex items-center gap-1 rounded-full border border-border bg-muted p-1 pr-3.5 text-sm font-semibold transition-colors hover:border-border-strong"
            >
              <span className="flex items-center gap-2 rounded-full bg-card px-3 py-1 ring-1 ring-border">
                <span aria-hidden className="size-2 rounded-full bg-primary" />
                Five tools live
              </span>
              <span className="ml-2 inline-flex items-center gap-1.5">
                See what&apos;s inside <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
            <h1
              id="hero-heading"
              className="mt-8 text-[clamp(2.5rem,6.2vw,4.75rem)] leading-[1.04] font-extrabold tracking-[-0.04em]"
            >
              Better insights.
              <br className="hidden sm:block" /> Stronger <PointerHighlight>decisions.</PointerHighlight>
            </h1>
            <p className="mx-auto mt-8 max-w-[56ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Yedara is a connected UX research workspace. Plan the study, understand your users, analyse competitors,
              synthesise what you heard and find the opportunities worth acting on.
            </p>
            <div className="mt-9 flex flex-col items-center gap-4">
              <Button asChild size="lg" className="h-12 rounded-full px-8 text-base font-bold">
                <Link href="/signup">
                  Start free <ArrowRight />
                </Link>
              </Button>
              <Link
                href="/features"
                className="rounded-md text-[15px] font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                See the features
              </Link>
              <p className="text-sm text-muted-foreground">{siteConfig.tagline} No payment step to start.</p>
            </div>
          </div>
          <div className="rise rise-delay mt-14 sm:mt-20">
            <LaptopMockup
              src="/marketing/app-board.png"
              darkSrc="/marketing/app-board-dark.png"
              alt="The Research Synthesizer in Yedara: an affinity board with observation cards grouped into themes."
            />
            <p className="mt-8 text-sm text-muted-foreground">
              The Research Synthesizer&apos;s affinity board in the real app, shown with sample research data.
            </p>
          </div>
        </div>
      </section>

      <ConnectedWorkflow />

      <Section labelledBy="tools-heading">
        <div className="max-w-3xl">
          <SectionHeading id="tools-heading">Six tools. Each does one job well.</SectionHeading>
          <Lede className="mt-6">
            Five are live today. The sixth, the Opportunity Analyzer, is in development, and the Journey Mapper already
            saves opportunities for it.
          </Lede>
        </div>
        <div className="mt-16">
          {MODULES.map((m, i) => (
            <ModuleSection key={m.slug} module={m} index={i} variant="summary" />
          ))}
        </div>
      </Section>

      <WorkflowBand />
      <Differentiators />
      <PricingPreview />
      <FaqSection />
      <FinalCta />
    </>
  );
}
