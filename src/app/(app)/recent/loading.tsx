import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading recent work" className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9 w-96 max-w-full" />
      <Skeleton className="h-72 w-full rounded-card" />
    </div>
  );
}
