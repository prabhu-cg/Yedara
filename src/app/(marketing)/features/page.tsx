import type { Metadata } from "next";
import { FRAME, Lede } from "@/components/marketing/frame";
import { FeatureAnchors } from "@/components/marketing/feature-anchors";
import { ModuleSection } from "@/components/marketing/module-section";
import { ConnectedWorkflow, FinalCta, WorkflowBand } from "@/components/marketing/sections";
import { MODULES } from "@/config/marketing";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Seven connected research tools: Research Planner, Persona Builder, Competitor Analyzer, Research Synthesizer, Empathy Mapper, Journey Mapper and the upcoming Opportunity Analyzer.",
  alternates: { canonical: "/features" },
  openGraph: { title: "Yedara features", url: "/features" },
};

export default function FeaturesPage() {
  return (
    <>
      <header className="bg-surface">
        <div className={`${FRAME} pt-16 pb-6 sm:pt-24`}>
          <h1 className="max-w-4xl text-5xl leading-none sm:text-6xl">
            Everything in the workspace, and what it does not do.
          </h1>
          <Lede className="mt-7">
            Six research tools are live and one is in development. They share a project, so what you learn in one is
            available in the next.
          </Lede>
        </div>
      </header>

      {/* The index sticks under the site header while you read the tools, and releases when they end. */}
      <div>
        <div className="sticky top-16 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
          <div className={FRAME}>
            <FeatureAnchors items={MODULES.map((m) => ({ slug: m.slug, name: m.name }))} />
          </div>
        </div>
        <div className={`${FRAME} pt-12 pb-16 sm:pb-20`}>
          {MODULES.map((m, i) => (
            <ModuleSection key={m.slug} module={m} index={i} variant="full" />
          ))}
        </div>
      </div>

      <ConnectedWorkflow />
      <WorkflowBand tone="paper" />
      <FinalCta />
    </>
  );
}
