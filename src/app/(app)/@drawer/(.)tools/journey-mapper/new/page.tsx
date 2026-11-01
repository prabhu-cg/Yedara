import { NewJourneyPanel, projectParam } from "@/components/forms/form-panels";
import { RouteDrawer } from "@/components/layout/route-drawer";

export default async function NewJourneyDrawer({ searchParams }: PageProps<"/tools/journey-mapper/new">) {
  const params = await searchParams;
  return (
    <RouteDrawer key={"/tools/journey-mapper/new"} routeKey={"/tools/journey-mapper/new"} title="New journey map" description="Choose the project and persona, name the journey, and say whether it is how things work today or how they should.">
      <NewJourneyPanel defaultProjectId={projectParam(params)} />
    </RouteDrawer>
  );
}
