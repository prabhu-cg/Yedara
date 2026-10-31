import { NewPersonaPanel, projectParam } from "@/components/forms/form-panels";
import { RouteDrawer } from "@/components/layout/route-drawer";

export default async function NewPersonaDrawer({ searchParams }: PageProps<"/tools/persona-builder/new">) {
  const params = await searchParams;
  return (
    <RouteDrawer title="New persona" description="Name the persona, choose its project, and say how much evidence it rests on.">
      <NewPersonaPanel defaultProjectId={projectParam(params)} />
    </RouteDrawer>
  );
}
