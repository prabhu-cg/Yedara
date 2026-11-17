import type { Metadata, Viewport } from "next";
import { DM_Sans, Newsreader } from "next/font/google";
import { themeInitScript } from "@/components/theme/theme-menu";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig, siteUrl } from "@/config/site";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

// Newsreader is loaded as one static weight (500) with no optical-size axis, as in Doxa.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: "500",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${siteConfig.name} — ${siteConfig.descriptor}`, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141312" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dmSans.variable} ${newsreader.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
