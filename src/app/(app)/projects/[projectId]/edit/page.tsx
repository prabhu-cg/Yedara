import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { Card, CardContent } from "@/components/ui/card";
import { getProject } from "@/lib/projects/queries";
import { EDITABLE_STATUSES, PROJECT_TYPE_VALUES } from "@/lib/projects/constants";
import type { ProjectFormValues } from "@/lib/projects/schemas";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: PageProps<"/projects/[projectId]/edit">) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  const archived = project.status === "archived";

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
    status:
      (EDITABLE_STATUSES as readonly string[]).includes(project.status)
        ? (project.status as ProjectFormValues["status"])
        : (project.previous_status ?? "planning"),
  };

  return (
    <>
      <PageHeader
        backHref={`/projects/${project.id}`}
        backLabel={project.name}
        title="Edit project"
        description="Update the details of this project."
      />
      <Card className="max-w-2xl">
        <CardContent className="pt-5 sm:pt-6">
          <ProjectForm mode="edit" projectId={project.id} defaultValues={defaultValues} archived={archived} />
        </CardContent>
      </Card>
    </>
  );
}
