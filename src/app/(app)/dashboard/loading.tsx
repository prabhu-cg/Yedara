import { Skeleton } from "@/components/ui/skeleton";
import { CardGridSkeleton, PageHeaderSkeleton } from "@/components/layout/page-skeletons";

export default function DashboardLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <CardGridSkeleton count={3} />
    </>
  );
}
