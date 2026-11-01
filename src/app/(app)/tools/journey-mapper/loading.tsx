import { CardGridSkeleton, PageHeaderSkeleton } from "@/components/layout/page-skeletons";

export default function JourneyMapperLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <CardGridSkeleton count={3} />
    </>
  );
}
