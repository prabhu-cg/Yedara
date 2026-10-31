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
import { listPlans } from "@/lib/research-planner/queries";
import { PlanCard } from "@/components/research-planner/plan-card";
import { AnalysisCard } from "@/components/competitors/analysis-card";
import { PersonaCard } from "@/components/personas/persona-card";
import { listAnalyses } from "@/lib/competitors/queries";
import { listPersonas } from "@/lib/personas/queries";
import { Plus } from "lucide-react";

export async function generateMetadata({ params }: PageProps<"/projects/[projectId]">): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getProject(projectId);
  return { title: project.name };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  const archived = project.status === "archived";
  const [plans, personas, analyses] = await Promise.all([
    listPlans({ projectId: project.id }),
    listPersonas({ projectId: project.id }),
    listAnalyses({ projectId: project.id }),
  ]);
  const brief = [
    { label: "Product or service", value: project.product_service },
    { label: "Target audience", value: project.target_audience },
    { label: "Research objectives", value: project.research_objectives },
  ].filter((b) => b.value);

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
          className="mb-6 flex items-center gap-2.5 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
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
                <Link href={`/projects/${project.id}/edit`} className="font-semibold text-primary-text hover:underline">
                  Add one
                </Link>
              </p>
            )}
            {brief.length > 0 && (
              <dl className="mt-5 space-y-3 border-t border-border pt-4">
                {brief.map((b) => (
                  <div key={b.label}>
                    <dt className="text-xs text-muted-foreground">{b.label}</dt>
                    <dd className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{b.value}</dd>
                  </div>
                ))}
              </dl>
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

      <section aria-labelledby="project-plans" className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="project-plans" className="text-base font-bold">
            Research plans
          </h2>
          {!archived && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/tools/research-planner/new?project=${project.id}`}>
                <Plus /> New plan
              </Link>
            </Button>
          )}
        </div>
        {plans.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-input bg-secondary px-5 py-6 text-sm text-muted-foreground">
            No research plans for this project yet.
          </p>
        )}
      </section>

      <section aria-labelledby="project-personas" className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="project-personas" className="text-base font-bold">
            Personas
          </h2>
          {!archived && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/tools/persona-builder/new?project=${project.id}`}>
                <Plus /> New persona
              </Link>
            </Button>
          )}
        </div>
        {personas.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {personas.map((item) => (
              <PersonaCard key={item.id} persona={item} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-input bg-secondary px-5 py-6 text-sm text-muted-foreground">
            No personas for this project yet.
          </p>
        )}
      </section>

      <section aria-labelledby="project-analyses" className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="project-analyses" className="text-base font-bold">
            Competitor analyses
          </h2>
          {!archived && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/tools/competitor-analyzer/new?project=${project.id}`}>
                <Plus /> New analysis
              </Link>
            </Button>
          )}
        </div>
        {analyses.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {analyses.map((item) => (
              <AnalysisCard key={item.id} analysis={item} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-input bg-secondary px-5 py-6 text-sm text-muted-foreground">
            No competitor analyses for this project yet.
          </p>
        )}
      </section>

      <section aria-labelledby="project-tools" className="mt-10">
        <h2 id="project-tools" className="mb-1 text-base font-bold">
          Research tools
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Open a tool to add work to this project.
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
