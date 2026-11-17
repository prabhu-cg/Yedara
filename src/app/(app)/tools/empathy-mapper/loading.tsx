import { CardGridSkeleton, PageHeaderSkeleton } from "@/components/layout/page-skeletons";

export default function EmpathyMapperLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <CardGridSkeleton count={3} />
    </>
  );
}
