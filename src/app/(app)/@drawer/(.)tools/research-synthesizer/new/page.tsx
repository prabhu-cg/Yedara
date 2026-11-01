import { NewSynthesisPanel, projectParam } from "@/components/forms/form-panels";
import { RouteDrawer } from "@/components/layout/route-drawer";

export default async function NewSynthesisDrawer({ searchParams }: PageProps<"/tools/research-synthesizer/new">) {
  const params = await searchParams;
  return (
    <RouteDrawer key={"/tools/research-synthesizer/new"} routeKey={"/tools/research-synthesizer/new"} title="New research synthesis" description="Name the synthesis and choose its project. You add the research material next.">
      <NewSynthesisPanel defaultProjectId={projectParam(params)} />
    </RouteDrawer>
  );
}
