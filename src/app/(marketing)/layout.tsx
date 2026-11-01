import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { siteConfig } from "@/config/site";
import "./marketing.css";

export const metadata: Metadata = {
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "en",
  },
  twitter: { card: "summary_large_image" },
};

/** The public site. It shares nothing with the authenticated shell except the brand mark and form primitives. */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="marketing flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only rounded-lg bg-charcoal px-4 py-2 font-semibold text-charcoal-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
