import { NewEmpathyPanel, projectParam } from "@/components/forms/form-panels";
import { RouteDrawer } from "@/components/layout/route-drawer";

export default async function NewEmpathyDrawer({ searchParams }: PageProps<"/tools/empathy-mapper/new">) {
  const params = await searchParams;
  return (
    <RouteDrawer key={"/tools/empathy-mapper/new"} routeKey={"/tools/empathy-mapper/new"} title="New empathy map" description="Choose the project, say who the map is about, and describe the situation. A persona is optional.">
      <NewEmpathyPanel defaultProjectId={projectParam(params)} />
    </RouteDrawer>
  );
}
