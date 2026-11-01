import type { Metadata } from "next";
import Link from "next/link";
import { FRAME, Lede } from "@/components/marketing/frame";
import { ModuleSection } from "@/components/marketing/module-section";
import { ConnectedWorkflow, FinalCta, WorkflowBand } from "@/components/marketing/sections";
import { MODULES } from "@/config/marketing";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Six connected research tools: Research Planner, Persona Builder, Competitor Analyzer, Research Synthesizer, Journey Mapper and the upcoming Opportunity Analyzer.",
  alternates: { canonical: "/features" },
  openGraph: { title: "Yedara features", url: "/features" },
};

export default function FeaturesPage() {
  return (
    <>
      <header className={`${FRAME} pt-16 pb-6 sm:pt-24`}>
        <h1 className="max-w-4xl text-[clamp(2.5rem,6vw,4.5rem)] leading-[1] font-extrabold tracking-[-0.04em]">
          Everything in the workspace, and what it does not do.
        </h1>
        <Lede className="mt-7">
          Five research tools are live and one is in development. They share a project, so what you learn in one is
          available in the next.
        </Lede>
        <nav aria-label="On this page" className="mt-10 flex flex-wrap gap-2">
          {MODULES.map((m) => (
            <Link
              key={m.slug}
              href={`#${m.slug}`}
              className="rounded-full border border-border-strong px-4 py-2 text-sm font-bold transition-colors hover:border-foreground hover:bg-card"
            >
              {m.name}
            </Link>
          ))}
        </nav>
      </header>

      <div className={`${FRAME} pt-12 pb-20 sm:pb-28`}>
        {MODULES.map((m, i) => (
          <ModuleSection key={m.slug} module={m} index={i} variant="full" />
        ))}
      </div>

      <ConnectedWorkflow />
      <WorkflowBand />
      <FinalCta />
    </>
  );
}
