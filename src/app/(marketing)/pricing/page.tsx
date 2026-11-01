import type { Metadata } from "next";
import { FRAME, Section } from "@/components/marketing/frame";
import { Faq, FinalCta, PlanPanels } from "@/components/marketing/sections";
import { Lede, SectionHeading } from "@/components/marketing/frame";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Yedara Free is available now. Pro is in development and not yet on sale; tell us what you would need from it.",
  alternates: { canonical: "/pricing" },
  openGraph: { title: "Yedara pricing", url: "/pricing" },
};

export default function PricingPage() {
  return (
    <>
      <header className={`${FRAME} pt-16 pb-12 sm:pt-24`}>
        <h1 className="max-w-4xl text-[clamp(2.5rem,6vw,4.5rem)] leading-[1] font-extrabold tracking-[-0.04em]">
          Free today. Pro when it&apos;s ready.
        </h1>
        <Lede className="mt-7">
          Yedara has one plan you can use now. A Pro plan is in development; it has no price yet because it
          isn&apos;t for sale.
        </Lede>
      </header>

      <div className={`${FRAME} pb-20 sm:pb-28`}>
        <PlanPanels />
      </div>

      <Section tone="sand" labelledBy="pro-heading">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading id="pro-heading">Shape Pro with us.</SectionHeading>
          </div>
          <div className="lg:col-span-7">
            <Lede>
              We would rather build Pro around real needs than guess at them. If a limit, a feature or a way of
              working would make you upgrade, use the Feedback button and tell us. Feedback is public, so leave out personal details.
            </Lede>
          </div>
        </div>
      </Section>

      <Section labelledBy="pricing-faq">
        <SectionHeading id="pricing-faq" className="mb-10">
          Pricing questions
        </SectionHeading>
        <Faq limit={3} />
      </Section>

      <FinalCta />
    </>
  );
}
