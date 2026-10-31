"use client";

import { usePathname } from "next/navigation";

/** The address that failed, in a soft code chip. */
export function NotFoundAddress() {
  const pathname = usePathname();
  return (
    <code className="mt-6 max-w-full truncate rounded-md bg-primary-soft px-2 py-1 font-mono text-xs text-primary-text">
      {pathname}
    </code>
  );
}
