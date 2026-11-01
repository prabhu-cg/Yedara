import type { Metadata } from "next";
import Link from "next/link";
import { FRAME, Lede, Section, SectionHeading } from "@/components/marketing/frame";
import { FinalCta } from "@/components/marketing/sections";
import { DIFFERENTIATORS } from "@/config/marketing";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Yedara exists: research tools that keep evidence attached, say what is unknown, and never invent findings.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About Yedara", url: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <header className={`${FRAME} pt-16 pb-16 sm:pt-24`}>
        <h1 className="max-w-4xl text-[clamp(2.5rem,6vw,4.5rem)] leading-[1] font-extrabold tracking-[-0.04em]">
          Research is only useful if people believe it.
        </h1>
        <Lede className="mt-7 max-w-[62ch]">
          Yedara is a connected UX research workspace for designers, researchers, agencies and product teams. It exists
          so the person who ran the study can show, step by step, how a note from a participant became a decision.
        </Lede>
      </header>

      <Section tone="sand" labelledBy="problem-heading">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading id="problem-heading">Why we built it</SectionHeading>
          </div>
          <div className="space-y-5 text-lg text-muted-foreground lg:col-span-7">
            <p>
              A typical study lives in a plan document, a folder of notes, a board someone screenshotted and a slide
              deck. By the time a recommendation reaches a stakeholder, the trail back to what a participant actually
              said has gone cold.
            </p>
            <p>
              Yedara keeps that trail. The plan, personas, competitor matrix, observations, insights and journeys sit in
              one project and point at each other, so the question &ldquo;how do we know?&rdquo; always has an answer
              you can click.
            </p>
          </div>
        </div>
      </Section>

      <Section labelledBy="principles-heading">
        <SectionHeading id="principles-heading" className="max-w-3xl">
          What we hold ourselves to
        </SectionHeading>
        <dl className="mt-14 grid gap-x-16 gap-y-12 md:grid-cols-2">
          {DIFFERENTIATORS.map((d) => (
            <div key={d.title}>
              <dt className="text-xl font-extrabold tracking-tight">{d.title}</dt>
              <dd className="mt-2 max-w-[48ch] text-muted-foreground">{d.text}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section tone="sand" labelledBy="who-heading">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading id="who-heading">Who it&apos;s for</SectionHeading>
          </div>
          <div className="space-y-5 text-lg text-muted-foreground lg:col-span-7">
            <p>
              Freelance designers, independent researchers, startups, agencies and product teams who run their own
              studies and have to justify what comes out of them to a client or a roadmap meeting.
            </p>
            <p>
              Where we are today: five tools are live, the Opportunity Analyzer is in development, and projects are
              private to one account. See{" "}
              <Link href="/features" className="font-bold text-primary-text underline underline-offset-4">
                the features
              </Link>{" "}
              for exactly what each does.
            </p>
          </div>
        </div>
      </Section>

      <FinalCta />
    </>
  );
}
