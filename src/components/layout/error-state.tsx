"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";

/** Shared body for route-level error boundaries. Never renders raw error text. */
export function ErrorState({
  error,
  reset,
  title = "Something went wrong",
  description = "We couldn't load this page. Try again, and if the problem continues come back in a few minutes.",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}) {
  useEffect(() => {
    console.error("[ui] route error", error.digest ?? "");
  }, [error]);

  return (
    <EmptyState
      icon={TriangleAlert}
      title={title}
      description={description}
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
