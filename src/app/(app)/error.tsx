"use client";

import { ErrorState } from "@/components/layout/error-state";

export default function AppError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState {...props} />;
}
