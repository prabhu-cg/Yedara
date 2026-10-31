import Image from "next/image";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { siteConfig } from "@/config/site";

/**
 * The brand panel on the sign-in and sign-up pages (from `lg` up): an abstract photograph
 * with a terracotta tint and a dark scrim so the white text stays readable on every part of it.
 *
 * Photo: "Abstract, layered shapes with a gradient orange color" by Philip Oroni on Unsplash
 * (https://unsplash.com/photos/5q4zsTaVN4I), free to use under the Unsplash License.
 */
export function AuthAside() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-[#3a1605] p-12 lg:flex lg:w-[58%]">
      <Image
        src="/auth/panel.jpg"
        alt=""
        fill
        priority
        sizes="58vw"
        className="object-cover object-[70%_50%]"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-primary opacity-35 mix-blend-multiply" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[#180902]/62 via-[#180902]/38 via-52% to-[#180902]/86"
      />

      <Link
        href="/"
        className="relative flex w-fit items-center gap-3 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
      >
        <LogoMark variant="white" className="size-9" />
        <span className="text-xl font-bold tracking-tight text-white">{siteConfig.name}</span>
      </Link>

      <div className="relative max-w-lg">
        <span
          className="-ml-3 block leading-none text-white/20 select-none"
          style={{ fontSize: "10rem", lineHeight: 1 }}
          aria-hidden="true"
        >
          &ldquo;
        </span>
        <blockquote className="-mt-6 text-[1.6rem] leading-snug font-semibold text-white [text-shadow:0_1px_14px_rgb(0_0_0/0.35)]">
          Good decisions start with better questions, and better questions start with a plan.
        </blockquote>
        <p className="mt-5 text-sm font-medium tracking-wide text-white/75">— {siteConfig.descriptor}</p>
      </div>

      <p className="relative text-xs text-white/60">
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
      <h1 className="text-2xl font-bold tracking-tight">{siteConfig.name}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{siteConfig.tagline}</p>
    </Link>
  );
}
