import { EditProjectPanel } from "@/components/forms/form-panels";
import { RouteDrawer } from "@/components/layout/route-drawer";

export default async function EditProjectDrawer({ params }: PageProps<"/projects/[projectId]/edit">) {
  const { projectId } = await params;
  return (
    <RouteDrawer key={`/projects/${projectId}/edit`} routeKey={`/projects/${projectId}/edit`} title="Edit project" description="Update the details of this project.">
      <EditProjectPanel projectId={projectId} />
    </RouteDrawer>
  );
}
