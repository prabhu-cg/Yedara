import type { Metadata } from "next";
import Link from "next/link";
import { Archive, Building2, CalendarDays, Clock, Factory, Pencil, Shapes } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectActionsMenu } from "@/components/projects/project-actions-menu";
import { StatusBadge } from "@/components/projects/status-badge";
import { ToolCard } from "@/components/tools/tool-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { researchTools } from "@/config/tools";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { projectTypeLabel } from "@/lib/projects/constants";
import { getProject } from "@/lib/projects/queries";

export async function generateMetadata({ params }: PageProps<"/projects/[projectId]">): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getProject(projectId);
  return { title: project.name };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  const archived = project.status === "archived";

  const details = [
    { icon: Shapes, label: "Project type", value: projectTypeLabel(project.project_type) },
    { icon: Building2, label: "Client", value: project.client },
    { icon: Factory, label: "Industry", value: project.industry },
    { icon: CalendarDays, label: "Created", value: formatDate(project.created_at) },
    { icon: Clock, label: "Last edited", value: formatRelativeTime(project.updated_at) },
  ];

  return (
    <>
      <PageHeader
        backHref="/projects"
        backLabel="My Projects"
        title={project.name}
        meta={<StatusBadge status={project.status} />}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/projects/${project.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
            <ProjectActionsMenu
              projectId={project.id}
              projectName={project.name}
              archived={archived}
              includeEdit={false}
              redirectAfterDelete="/projects"
            />
          </>
        }
      />

      {archived && (
        <div
          role="status"
          className="mb-6 flex items-center gap-2.5 rounded-lg border border-border bg-status-archived px-4 py-3 text-sm text-status-archived-foreground"
        >
          <Archive aria-hidden className="size-4 shrink-0" />
          This project is archived. Restore it from the actions menu to continue working on it.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>About this project</CardTitle>
          </CardHeader>
          <CardContent>
            {project.description ? (
              <p className="whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">
                {project.description}
              </p>
            ) : (
              <p className="text-muted-foreground">
                No description yet.{" "}
                <Link href={`/projects/${project.id}/edit`} className="font-semibold text-primary hover:underline">
                  Add one
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              {details.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-semibold [overflow-wrap:anywhere]">{value || "—"}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="project-tools" className="mt-10">
        <h2 id="project-tools" className="mb-1 text-lg font-semibold">
          Research tools
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Tools will attach their work to this project as they launch.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {researchTools.map((tool) => (
            <li key={tool.slug}>
              <ToolCard tool={tool} compact />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
