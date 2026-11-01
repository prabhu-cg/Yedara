import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The signed-in application and its endpoints are not for search engines.
      disallow: ["/dashboard", "/projects", "/tools", "/templates", "/settings", "/billing", "/recent", "/api/", "/auth/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
