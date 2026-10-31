"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog as DrawerPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CLOSE_MS = 200;

type DrawerApi = {
  /** Slide the drawer out, go back to the page underneath, then run `after`. */
  close: (after?: () => void) => void;
};

const DrawerContext = React.createContext<DrawerApi | null>(null);

/** The surrounding drawer, or null when the same form is rendered as a full page. */
export const useRouteDrawer = () => React.useContext(DrawerContext);

/**
 * A right-hand drawer that is a route: the page underneath stays in place, the URL still
 * works as a link, and Back or Escape closes it. Used by intercepting routes in `@drawer`.
 */
export function RouteDrawer({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);
  const closing = React.useRef(false);

  const close = React.useCallback(
    (after?: () => void) => {
      if (closing.current) return;
      closing.current = true;
      setOpen(false);
      // Let the slide-out finish before the route (and this drawer) goes away.
      window.setTimeout(() => {
        router.back();
        after?.();
      }, CLOSE_MS);
    },
    [router],
  );

  const api = React.useMemo(() => ({ close }), [close]);

  return (
    <DrawerContext.Provider value={api}>
      <DrawerPrimitive.Root open={open} onOpenChange={(next) => !next && close()}>
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DrawerPrimitive.Content
            className="fixed inset-y-0 right-0 z-50 flex h-full w-[min(40rem,100vw)] flex-col border-l border-border bg-background shadow-raised outline-none duration-200 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right"
          >
            <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div className="min-w-0 space-y-1">
                <DrawerPrimitive.Title className="text-xl leading-tight font-bold [overflow-wrap:anywhere]">{title}</DrawerPrimitive.Title>
                {description ? (
                  <DrawerPrimitive.Description className="text-sm leading-6 text-muted-foreground">{description}</DrawerPrimitive.Description>
                ) : (
                  <DrawerPrimitive.Description className="sr-only">{title}</DrawerPrimitive.Description>
                )}
              </div>
              <DrawerPrimitive.Close className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                <X aria-hidden className="size-4" />
                <span className="sr-only">Close</span>
              </DrawerPrimitive.Close>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>
    </DrawerContext.Provider>
  );
}

/** Cancel: closes the drawer when there is one, otherwise links back to `href`. */
export function CancelButton({ href }: { href: string }) {
  const drawer = useRouteDrawer();
  if (drawer) {
    return (
      <Button type="button" variant="outline" onClick={() => drawer.close()}>
        Cancel
      </Button>
    );
  }
  return (
    <Button asChild variant="outline">
      <Link href={href}>Cancel</Link>
    </Button>
  );
}
