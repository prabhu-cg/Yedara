"use client";

import { ErrorState } from "@/components/layout/error-state";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
      <ErrorState error={error} reset={reset} />
    </main>
  );
}
