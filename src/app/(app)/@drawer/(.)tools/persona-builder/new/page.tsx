import { NewPersonaPanel, projectParam } from "@/components/forms/form-panels";
import { RouteDrawer } from "@/components/layout/route-drawer";

export default async function NewPersonaDrawer({ searchParams }: PageProps<"/tools/persona-builder/new">) {
  const params = await searchParams;
  return (
    <RouteDrawer key={"/tools/persona-builder/new"} routeKey={"/tools/persona-builder/new"} title="New persona" description="Name the persona, choose its project, and say how much evidence it rests on.">
      <NewPersonaPanel defaultProjectId={projectParam(params)} />
    </RouteDrawer>
  );
}
