import { CardGridSkeleton, PageHeaderSkeleton } from "@/components/layout/page-skeletons";

export default function CompetitorAnalyzerLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <CardGridSkeleton count={3} />
    </>
  );
}
