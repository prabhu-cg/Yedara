import Image from "next/image";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { siteConfig } from "@/config/site";

/**
 * The brand panel on the sign-in and sign-up pages (from `lg` up): a photograph of a research
 * team's affinity wall (handwritten participant quotes clustered on sticky notes, the raw
 * evidence Yedara keeps attached), under one flat charcoal scrim (no tint, no gradient) so the
 * white logo, quote and copyright stay readable on every part of it.
 *
 * Photo: "A bulletin board covered in sticky notes in an office" by Christian Brok on Unsplash
 * (https://unsplash.com/photos/FIWW1Cjj23I), free to use under the Unsplash License.
 */
export function AuthAside() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-[#353335] p-12 lg:flex lg:w-[58%]">
      <Image
        src="/auth/panel.jpg"
        alt=""
        fill
        priority
        sizes="58vw"
        className="object-cover object-[25%_50%]"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[#353335]/80" />

      <Link
        href="/"
        className="relative flex w-fit items-center gap-3 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
      >
        <LogoMark variant="white" className="size-9" />
        <span className="font-display text-2xl tracking-tight text-white">{siteConfig.name}</span>
      </Link>

      <div className="relative max-w-lg">
        <span
          className="-ml-3 block leading-none text-white/20 select-none"
          style={{ fontSize: "10rem", lineHeight: 1 }}
          aria-hidden="true"
        >
          &ldquo;
        </span>
        <blockquote className="font-display -mt-6 text-[1.75rem] leading-snug text-white">
          Good decisions start with better questions, and better questions start with a plan.
        </blockquote>
        <p className="mt-5 text-sm font-medium text-white/80">— {siteConfig.descriptor}</p>
      </div>

      <p className="relative text-xs text-white/70">
        © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </p>
    </div>
  );
}

/** The mark, name and tagline above the form. Shown on every screen size. */
export function AuthFormLogo() {
  return (
    <Link
      href="/"
      className="mb-6 flex flex-col items-center rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:mb-8"
    >
      <LogoMark className="mb-2 size-10 sm:mb-3 sm:size-14" />
      <h1 className="text-3xl">{siteConfig.name}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{siteConfig.tagline}</p>
    </Link>
  );
}
