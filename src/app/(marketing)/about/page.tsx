import type { Metadata } from "next";
import Link from "next/link";
import { DocSection, LegalPageShell } from "@/components/marketing/legal";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Yedara is, how it is built, what is live and what is next, and who built it and why.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About Yedara", url: "/about" },
};

const STACK: [string, string][] = [
  ["Framework", "Next.js (App Router), React 19, TypeScript (strict)"],
  ["Styling", "Tailwind CSS v4, shadcn-style components on Radix primitives"],
  ["Icons & Type", "Lucide, Newsreader and DM Sans"],
  ["Forms & Validation", "React Hook Form with Zod schemas"],
  ["Data", "PostgreSQL on Supabase, with row-level security on every table"],
  ["Identity", "Supabase Auth, with each account's projects checked on every request"],
  ["Exports", "PDF, Word and Markdown, generated from one document model"],
  ["Hosting", "Vercel"],
];

export default function AboutPage() {
  return (
    <LegalPageShell badge="V1" title="About Yedara" subtitle={siteConfig.tagline}>
      <DocSection title="What it is">
        <p>
          Yedara is a connected UX research workspace for designers, researchers, agencies and product teams. A typical
          study lives in a plan document, a folder of notes, a board someone screenshotted and a slide deck. By the time
          a recommendation reaches a stakeholder, the trail back to what a participant actually said has gone cold.
        </p>
        <p>
          Yedara is built around the whole chain: plan, understand your users, analyse competitors, synthesise what you
          heard, map the journey and find the opportunities. Everything sits in one project and points at each other,
          so the question &ldquo;how do we know?&rdquo; always has an answer you can click.
        </p>
        <p>
          It is honest about what it doesn&apos;t know. Nothing is generated or invented, personas say whether they are
          research-backed, a hypothesis or a proto-persona, and an unknown cell in a matrix is a research gap, not a
          weakness.
        </p>
      </DocSection>

      <DocSection title="How it is built">
        <dl className="mb-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {STACK.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{k}</dt>
              <dd className="mt-1 text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <p>
          Yedara is private by default: every project belongs to one account, and every request that touches it
          re-verifies who is asking, rather than trusting an ID supplied by the browser.
        </p>
      </DocSection>

      <DocSection title="What is live, and what is next">
        <p>
          <span className="font-semibold text-foreground">Live today:</span> the Research Planner, Persona Builder,
          Competitor Analyzer, Research Synthesizer and Journey Mapper, with PDF, Word and Markdown export for the
          planner, personas, competitor analyses and syntheses. The{" "}
          <Link href="/features">features page</Link> says exactly what each one does and doesn&apos;t do.
        </p>
        <p>
          <span className="font-semibold text-foreground">Next:</span> the Opportunity Analyzer, which already receives
          the opportunities you flag in the Journey Mapper, a journey export, and a Pro plan.
        </p>
      </DocSection>

      <DocSection title="Who built Yedara, and why">
        <p>
          Yedara was built by me, Prabhu Raja, a senior designer with 15+ years of experience across enterprise and B2B
          software. I work on enterprise products, design systems and digital experiences, with a simple aim:
          designing clarity from complexity.
        </p>
        <p>
          I built it because most research tools stop at the document. Notes, themes and slides drift apart, and nobody
          can show how a participant&apos;s words became a recommendation. Yedara keeps that trail: evidence stays attached
          from the raw observation to the insight to the journey, and never gets invented along the way.
        </p>
        <p>
          It is an independent project. I scoped, designed and built it myself, with AI in the loop, as part of how I
          now take products from idea to shipped. You can see more of my work at{" "}
          <a href="https://prabhuraja.vercel.app" target="_blank" rel="noopener noreferrer">
            prabhuraja.vercel.app
          </a>
          .
        </p>
        <p>
          Feedback, feature requests, or just want to say hello:{" "}
          <a href="mailto:prabhu_cg@proton.me">prabhu_cg@proton.me</a>. The Feedback button on every page works too,
          but it posts a public issue, so leave out personal details.
        </p>
      </DocSection>
    </LegalPageShell>
  );
}
