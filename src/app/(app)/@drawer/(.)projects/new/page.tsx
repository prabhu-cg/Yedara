import { NewProjectPanel } from "@/components/forms/form-panels";
import { RouteDrawer } from "@/components/layout/route-drawer";

export default function NewProjectDrawer() {
  return (
    <RouteDrawer title="Create a project" description="Tell us a little about the work. You can change any of this later.">
      <NewProjectPanel />
    </RouteDrawer>
  );
}
