"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dialog as DrawerPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { DrawerShell } from "@/components/ui/side-drawer";

/** The slide-out takes 180ms (see DrawerShell); wait for it before the route goes away. */
const CLOSE_MS = 190;

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
  routeKey,
  title,
  description,
  children,
}: {
  /** The pathname this drawer belongs to. The slot keeps its last page when you navigate elsewhere, so the drawer hides itself unless the address is its own. */
  routeKey: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
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

  if (pathname !== routeKey) return null;

  return (
    <DrawerContext.Provider value={api}>
      <DrawerPrimitive.Root open={open} onOpenChange={(next) => !next && close()}>
          <DrawerShell title={title} description={description} size="md">
            {children}
          </DrawerShell>
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
