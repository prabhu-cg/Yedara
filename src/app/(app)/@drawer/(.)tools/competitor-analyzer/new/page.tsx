import { NewAnalysisPanel, projectParam } from "@/components/forms/form-panels";
import { RouteDrawer } from "@/components/layout/route-drawer";

export default async function NewAnalysisDrawer({ searchParams }: PageProps<"/tools/competitor-analyzer/new">) {
  const params = await searchParams;
  return (
    <RouteDrawer title="New competitor analysis" description="Name the analysis and choose the project whose context it should reuse.">
      <NewAnalysisPanel defaultProjectId={projectParam(params)} />
    </RouteDrawer>
  );
}
