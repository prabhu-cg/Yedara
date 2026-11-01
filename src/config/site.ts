export const siteConfig = {
  name: "Yedara",
  tagline: "Know. Explore. Understand.",
  /** What the product is, for places that need a plain description rather than the tagline. */
  descriptor: "Research Workspace",
  description:
    "An affordable UX research workspace to plan research, understand users, analyse competitors, map journeys, synthesise findings and find opportunities.",
} as const;

/** Absolute origin for canonical URLs, the sitemap and social cards. */
export function siteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

/** Public pages, in sitemap order. */
export const PUBLIC_PATHS = ["/", "/features", "/pricing", "/about", "/privacy", "/terms"] as const;
