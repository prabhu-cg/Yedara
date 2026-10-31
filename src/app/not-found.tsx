import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { NotFoundAddress } from "@/components/layout/not-found-address";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[75dvh] flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--surface),var(--background)_70%)] px-4 py-16 text-center">
      <Badge variant="default">Error 404</Badge>
      <div aria-hidden className="mt-6 flex items-center gap-2 text-[96px] leading-none font-bold tracking-tighter sm:gap-3 sm:text-[128px]">
        <span>4</span>
        <span className="flex size-[84px] items-center justify-center rounded-full border-2 border-dashed border-border-strong sm:size-28">
          <LogoMark className="size-12 -rotate-6 sm:size-16" />
        </span>
        <span>4</span>
      </div>
      <h1 className="mt-6 text-xl font-bold sm:text-2xl">This page didn&apos;t get a reply.</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Open the app</Link>
        </Button>
      </div>
      <NotFoundAddress />
    </main>
  );
}
