import type { Metadata } from "next";
import { EditProjectPanel } from "@/components/forms/form-panels";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getProject } from "@/lib/projects/queries";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: PageProps<"/projects/[projectId]/edit">) {
  const { projectId } = await params;
  const project = await getProject(projectId);

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
          <EditProjectPanel projectId={project.id} />
        </CardContent>
      </Card>
    </>
  );
}
