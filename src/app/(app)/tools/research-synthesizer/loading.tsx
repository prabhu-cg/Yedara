import { CardGridSkeleton, PageHeaderSkeleton } from "@/components/layout/page-skeletons";

export default function ResearchSynthesizerLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <CardGridSkeleton count={3} />
    </>
  );
}
