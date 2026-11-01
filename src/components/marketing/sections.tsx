import Link from "next/link";
import { ArrowRight, Check, Plus } from "lucide-react";
import { FRAME, Lede, Section, SectionHeading } from "@/components/marketing/frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONNECTIONS, DIFFERENTIATORS, FAQS, PLANS, WORKFLOW, moduleBySlug } from "@/config/marketing";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** How the tools hand work to each other. The spine is the evidence thread from the hero. */
export function ConnectedWorkflow() {
  return (
    <Section tone="sand" labelledBy="overview-heading">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHeading id="overview-heading">One project. One thread of evidence.</SectionHeading>
          <Lede className="mt-6">
            Most research tools stop at the document. In Yedara, the plan, the people, the market, the notes and the
            journey all live in one project, and what you learn in one place is still traceable in the next.
          </Lede>
          <p className="mt-8 text-2xl font-extrabold tracking-tight">{siteConfig.tagline}</p>
        </div>
        <ol className="lg:col-span-7">
          {CONNECTIONS.map((c, i) => (
            <li key={c.from + c.to} className="relative grid grid-cols-[1.75rem_1fr] gap-x-5 pb-10 last:pb-0">
              {i < CONNECTIONS.length - 1 && (
                <span aria-hidden className="absolute top-8 -bottom-1 left-[0.8125rem] w-0.5 bg-primary/40" />
              )}
              <span aria-hidden className="relative z-10 mt-0.5 size-7 rounded-full border-[6px] border-primary bg-muted" />
              <div>
                <h3 className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xl font-extrabold tracking-tight">
                  {c.from}
                  <ArrowRight className="size-4 text-primary-text" aria-label="to" />
                  {c.to}
                </h3>
                <p className="mt-2 max-w-[56ch] text-muted-foreground">{c.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

export function WorkflowBand() {
  return (
    <Section tone="sand" labelledBy="workflow-heading">
      <SectionHeading id="workflow-heading" className="max-w-3xl">
        Plan, research, understand, then prioritise.
      </SectionHeading>
      <p className="mt-5 max-w-[56ch] text-lg text-muted-foreground">
        The order most studies follow, with a tool for each stage. Move forward, or jump back when the evidence changes your mind.
      </p>
      <ol className="mt-14 grid gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {WORKFLOW.map((step) => (
          <li key={step.phase} className="relative border-t-2 border-primary pt-7">
            <span aria-hidden className="absolute -top-[7px] left-0 size-3 rounded-full bg-primary" />
            <h3 className="text-[2rem] leading-none font-extrabold tracking-[-0.03em]">{step.phase}</h3>
            <p className="mt-3 text-[15px] text-muted-foreground">{step.line}</p>
            <ul className="mt-5 space-y-2">
              {step.slugs.map((slug) => {
                const m = moduleBySlug(slug);
                return (
                  <li key={slug}>
                    <Link
                      href={`/features#${slug}`}
                      className="inline-flex items-center gap-2 rounded-md font-bold underline decoration-primary decoration-2 underline-offset-4 hover:text-primary-text"
                    >
                      {m.name}
                    </Link>
                    {m.status === "in-development" && (
                      <span className="mt-1.5 block w-fit rounded-full border border-primary px-2 py-0.5 text-xs font-bold whitespace-nowrap text-primary-text">
                        In development
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function Differentiators() {
  return (
    <Section labelledBy="why-heading">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <SectionHeading id="why-heading">Research you can defend in the room.</SectionHeading>
            <Lede className="mt-6">
              Better insights are the ones a stakeholder can question and still stand. Yedara is built so every claim
              can show its working.
            </Lede>
          </div>
        </div>
        <dl className="lg:col-span-7">
          {DIFFERENTIATORS.map((d) => (
            <div key={d.title} className="border-t border-border-strong py-7 first:border-t-0 first:pt-0">
              <dt className="text-xl font-extrabold tracking-tight">{d.title}</dt>
              <dd className="mt-2 max-w-[56ch] text-muted-foreground">{d.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}

function PlanPanel({ plan, tone, compact }: { plan: (typeof PLANS)[keyof typeof PLANS]; tone: "free" | "pro"; compact?: boolean }) {
  const free = tone === "free";
  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl border p-7 sm:p-9",
        free ? "border-primary bg-card shadow-[0_18px_40px_-20px_#c7450466]" : "border-dashed border-border-strong bg-transparent",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-2xl font-extrabold tracking-tight">{plan.name}</h3>
        <Badge variant={free ? "success" : "default"}>{plan.status}</Badge>
      </div>
      <p className="mt-3 text-muted-foreground">{plan.blurb}</p>
      <ul className={cn("mt-6 space-y-3", compact && "mb-2")}>
        {plan.features.map((f) => (
          <li key={f} className="flex gap-3 text-[15px] leading-snug">
            <Check aria-hidden className={cn("mt-0.5 size-4 shrink-0", free ? "text-success" : "text-muted-foreground")} strokeWidth={3} />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-8">
        <Button asChild size="lg" variant={free ? "default" : "outline"} className="w-full font-bold sm:w-fit">
          <Link href={plan.cta.href}>{plan.cta.label}</Link>
        </Button>
      </div>
    </div>
  );
}

export function PlanPanels({ compact }: { compact?: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <PlanPanel plan={PLANS.free} tone="free" compact={compact} />
      <PlanPanel plan={PLANS.pro} tone="pro" compact={compact} />
    </div>
  );
}

export function PricingPreview() {
  return (
    <Section tone="sand" labelledBy="pricing-heading">
      <div className="max-w-2xl">
        <SectionHeading id="pricing-heading">Start free. Pro is still being shaped.</SectionHeading>
        <Lede className="mt-6">
          Everything available today is on the Free plan. Pro isn&apos;t on sale, so we&apos;re not showing a price we haven&apos;t set.
        </Lede>
      </div>
      <div className="mt-12">
        <PlanPanels />
      </div>
      <p className="mt-8">
        <Link href="/pricing" className="inline-flex items-center gap-1.5 rounded-md font-bold text-primary-text underline-offset-4 hover:underline">
          See the pricing page <ArrowRight className="size-4" aria-hidden />
        </Link>
      </p>
    </Section>
  );
}

export function Faq({ limit }: { limit?: number }) {
  const items = limit ? FAQS.slice(0, limit) : FAQS;
  return (
    <div className="faq divide-y divide-border-strong border-y border-border-strong">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-md py-5 text-lg font-bold tracking-tight [&::-webkit-details-marker]:hidden">
            {item.q}
            <span
              aria-hidden
              className="faq-icon flex size-8 shrink-0 items-center justify-center rounded-full border border-border-strong transition-transform duration-200"
            >
              <Plus className="size-4" />
            </span>
          </summary>
          <p className="max-w-[62ch] pr-12 pb-6 text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export function FaqSection() {
  return (
    <Section labelledBy="faq-heading">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <SectionHeading id="faq-heading">Questions, answered plainly.</SectionHeading>
          <p className="mt-5 text-muted-foreground">
            Something missing?{" "}
            <Link href="/contact" className="font-bold text-primary-text underline underline-offset-4">
              Ask us
            </Link>
            .
          </p>
        </div>
        <div className="lg:col-span-8">
          <Faq />
        </div>
      </div>
    </Section>
  );
}

export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-heading" className="on-primary bg-primary text-primary-foreground">
      <div className={cn(FRAME, "py-20 text-center sm:py-24")}>
        <h2 id="final-cta-heading" className="text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.05] font-extrabold tracking-[-0.03em]">
          Know. Explore. Understand.
        </h2>
        <p className="mx-auto mt-5 max-w-[48ch] text-lg text-primary-foreground/90">
          Better insights. Stronger decisions. Create a free workspace and bring your next study into one place.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="h-11 bg-primary-foreground px-6 text-base font-bold text-primary hover:bg-primary-foreground/90">
            <Link href="/signup">
              Start free <ArrowRight />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="ghost"
            className="h-11 border-white/70 px-6 text-base font-bold text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
          >
            <Link href="/features">Explore the features</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
