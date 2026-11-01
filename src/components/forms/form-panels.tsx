import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { NewJourneyForm } from "@/components/journeys/new-journey-form";
import { NewSynthesisForm } from "@/components/synthesizer/new-synthesis-form";
import { NewAnalysisForm } from "@/components/competitors/new-analysis-form";
import { NewPersonaForm } from "@/components/personas/new-persona-form";
import { ProjectForm } from "@/components/projects/project-form";
import { NewPlanForm } from "@/components/research-planner/new-plan-form";
import { Button } from "@/components/ui/button";
import { EDITABLE_STATUSES, PROJECT_TYPE_VALUES } from "@/lib/projects/constants";
import { getProject } from "@/lib/projects/queries";
import type { ProjectFormValues } from "@/lib/projects/schemas";
import { listPersonaOptions } from "@/lib/journeys/queries";
import { listProjectOptions } from "@/lib/research-planner/queries";

/**
 * The body of every new/edit form. The full page and the drawer (intercepting route in
 * `app/(app)/@drawer`) render the same panel, so the two can't drift apart.
 */

export function NewProjectPanel() {
  return <ProjectForm mode="create" />;
}

export async function EditProjectPanel({ projectId }: { projectId: string }) {
  const project = await getProject(projectId);
  const defaultValues: ProjectFormValues = {
    name: project.name,
    description: project.description ?? "",
    client: project.client ?? "",
    industry: project.industry ?? "",
    product_service: project.product_service ?? "",
    target_audience: project.target_audience ?? "",
    research_objectives: project.research_objectives ?? "",
    project_type: (PROJECT_TYPE_VALUES as readonly string[]).includes(project.project_type)
      ? (project.project_type as ProjectFormValues["project_type"])
      : "other",
    // Archived projects keep the status they will be restored to.
    status: (EDITABLE_STATUSES as readonly string[]).includes(project.status)
      ? (project.status as ProjectFormValues["status"])
      : (project.previous_status ?? "planning"),
  };
  return <ProjectForm mode="edit" projectId={project.id} defaultValues={defaultValues} archived={project.status === "archived"} />;
}

async function WithProjects({
  what,
  children,
}: {
  what: string;
  children: (projects: Awaited<ReturnType<typeof listProjectOptions>>) => React.ReactNode;
}) {
  const projects = await listProjectOptions();
  if (projects.length > 0) return <>{children(projects)}</>;
  return (
    <EmptyState
      icon={FolderPlus}
      title="Create a project first"
      description={`Every ${what} belongs to a project. Create one, then come back.`}
      action={
        <Button asChild variant="outline">
          <Link href="/projects/new">Create a project</Link>
        </Button>
      }
    />
  );
}

export function NewPlanPanel({ defaultProjectId }: { defaultProjectId?: string }) {
  return <WithProjects what="research plan">{(projects) => <NewPlanForm projects={projects} defaultProjectId={defaultProjectId} />}</WithProjects>;
}

export function NewPersonaPanel({ defaultProjectId }: { defaultProjectId?: string }) {
  return <WithProjects what="persona">{(projects) => <NewPersonaForm projects={projects} defaultProjectId={defaultProjectId} />}</WithProjects>;
}

export function NewAnalysisPanel({ defaultProjectId }: { defaultProjectId?: string }) {
  return <WithProjects what="analysis">{(projects) => <NewAnalysisForm projects={projects} defaultProjectId={defaultProjectId} />}</WithProjects>;
}

export function NewSynthesisPanel({ defaultProjectId }: { defaultProjectId?: string }) {
  return <WithProjects what="synthesis">{(projects) => <NewSynthesisForm projects={projects} defaultProjectId={defaultProjectId} />}</WithProjects>;
}

export async function NewJourneyPanel({ defaultProjectId }: { defaultProjectId?: string }) {
  const personas = await listPersonaOptions();
  return <WithProjects what="journey">{(projects) => <NewJourneyForm projects={projects} personas={personas} defaultProjectId={defaultProjectId} />}</WithProjects>;
}

/** `?project=` as a plain string, or undefined. */
export const projectParam = (params: Record<string, string | string[] | undefined>) =>
  typeof params.project === "string" ? params.project : undefined;
