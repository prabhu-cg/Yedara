"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Item = { slug: string; name: string };
type Box = { x: number; y: number; w: number; h: number };

const reducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The in-page index for the features page. It sticks under the site header and does three things:
 *  - one amber-tint highlight glides between the pills (a transform, never a re-layout) to show where you are,
 *    following your scroll as well as your clicks;
 *  - clicking a pill smooth-scrolls to its section (CSS `scroll-behavior`, off under reduced motion) and the
 *    highlight moves at once, so it never flickers through the sections in between;
 *  - on a phone the row scrolls sideways and keeps the current pill centred.
 * Everything is visible and working without JavaScript: the pills are plain `#anchor` links.
 */
export function FeatureAnchors({ items }: { items: Item[] }) {
  const navRef = useRef<HTMLElement>(null);
  const pills = useRef<Record<string, HTMLAnchorElement | null>>({});
  const lockUntil = useRef(0);
  const [active, setActive] = useState<string | null>(null);
  const [box, setBox] = useState<Box | null>(null);

  const measure = useCallback(() => {
    // Rest on the first pill while nothing is active, so the highlight fades in without sliding from a corner.
    const el = pills.current[active ?? items[0].slug];
    if (el) setBox({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
  }, [active, items]);

  useLayoutEffect(measure, [measure]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [measure]);

  // Scroll-spy: the section crossing a thin band near the top third of the viewport is the current one.
  useEffect(() => {
    const sections = items.map((i) => document.getElementById(i.slug)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        if (performance.now() < lockUntil.current) return;
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    const onScroll = () => {
      if (performance.now() >= lockUntil.current && window.scrollY < 120) setActive(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // A deep link (/features#journey-mapper) starts on its pill.
    const hash = window.location.hash.slice(1);
    const frame = requestAnimationFrame(() => {
      if (items.some((i) => i.slug === hash)) setActive(hash);
    });
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [items]);

  // On narrow screens the row scrolls sideways: keep the current pill in the middle of it.
  useEffect(() => {
    const nav = navRef.current;
    const el = active ? pills.current[active] : null;
    if (!nav || !el || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({
      left: el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2,
      behavior: reducedMotion() ? "auto" : "smooth",
    });
  }, [active]);

  return (
    <nav
      ref={navRef}
      aria-label="On this page"
      className="relative flex flex-nowrap gap-2 overflow-x-auto py-3 [scrollbar-width:none] md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden"
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 left-0 rounded-full border border-primary bg-accent",
          "transition-[transform,width,height,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:duration-150",
          active ? "opacity-100" : "opacity-0",
        )}
        style={box ? { transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h } : { opacity: 0 }}
      />
      {items.map((item, i) => (
        <a
          key={item.slug}
          ref={(el) => {
            pills.current[item.slug] = el;
          }}
          href={`#${item.slug}`}
          aria-current={active === item.slug ? "location" : undefined}
          onClick={() => {
            lockUntil.current = performance.now() + 1100;
            setActive(item.slug);
          }}
          style={{ "--i": i } as React.CSSProperties}
          className={cn(
            "pill-in relative z-10 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap outline-none",
            "transition-[color,border-color,background-color,transform] duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/40 active:scale-[0.97]",
            active === item.slug
              ? "border-transparent text-accent-foreground"
              : "border-border-strong text-foreground hover:border-primary hover:bg-muted",
          )}
        >
          {item.name}
        </a>
      ))}
    </nav>
  );
}
