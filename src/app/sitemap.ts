import type { MetadataRoute } from "next";
import { PUBLIC_PATHS, siteUrl } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();
  return PUBLIC_PATHS.map((path) => ({
    url: `${origin}${path === "/" ? "" : path}`,
    changeFrequency: path === "/privacy" || path === "/terms" ? "yearly" : "monthly",
    priority: path === "/" ? 1 : path === "/features" || path === "/pricing" ? 0.8 : 0.5,
  }));
}
