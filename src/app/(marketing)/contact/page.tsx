import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ContactForm } from "@/components/marketing/contact-form";
import { FRAME, Lede } from "@/components/marketing/frame";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Contact",
  description: "Ask a question about Yedara, get help with your account, or tell us what you would want from the Pro plan.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact Yedara", url: "/contact" },
};

export default function ContactPage() {
  return (
    <div className={`${FRAME} grid gap-12 pt-16 pb-24 sm:pt-24 lg:grid-cols-12 lg:gap-16`}>
      <header className="lg:col-span-5">
        <h1 className="text-[clamp(2.5rem,6vw,4.25rem)] leading-[1] font-extrabold tracking-[-0.04em]">
          Tell us what you&apos;re working on.
        </h1>
        <Lede className="mt-6">
          Questions about the product, help with your account, ideas for what to build next, or what you would need
          from Pro. Use the form and we&apos;ll reply by email.
        </Lede>
        <p className="mt-6 text-sm text-muted-foreground">
          We store your name, email and message only to answer you. See the{" "}
          <Link href="/privacy" className="font-bold text-primary-text underline underline-offset-4">
            privacy policy
          </Link>{" "}
          for details.
        </p>
      </header>
      <div className="lg:col-span-7">
        <Suspense fallback={<Skeleton className="h-[34rem] rounded-3xl" />}>
          <ContactForm />
        </Suspense>
      </div>
    </div>
  );
}
