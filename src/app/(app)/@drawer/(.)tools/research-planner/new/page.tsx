import { NewPlanPanel, projectParam } from "@/components/forms/form-panels";
import { RouteDrawer } from "@/components/layout/route-drawer";

export default async function NewPlanDrawer({ searchParams }: PageProps<"/tools/research-planner/new">) {
  const params = await searchParams;
  return (
    <RouteDrawer title="New research plan" description="Name your research and choose the project it belongs to. You'll fill in the rest step by step.">
      <NewPlanPanel defaultProjectId={projectParam(params)} />
    </RouteDrawer>
  );
}
