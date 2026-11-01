import type { Metadata } from "next";
import Link from "next/link";
import { Archive, Building2, CalendarDays, ChevronRight, Clock, Factory, Pencil, Shapes } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectActionsMenu } from "@/components/projects/project-actions-menu";
import { ProjectWork } from "@/components/projects/project-work";
import { StatusBadge } from "@/components/projects/status-badge";
import { Button } from "@/components/ui/button";
import { listAnalyses } from "@/lib/competitors/queries";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { listPersonas } from "@/lib/personas/queries";
import { projectTypeLabel } from "@/lib/projects/constants";
import { getProject } from "@/lib/projects/queries";
import { parseWorkParams } from "@/lib/projects/work-items";
import { listPlans } from "@/lib/research-planner/queries";
import { listJourneys } from "@/lib/journeys/queries";
import { listSyntheses } from "@/lib/synthesizer/queries";

export async function generateMetadata({ params }: PageProps<"/projects/[projectId]">): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getProject(projectId);
  return { title: project.name };
}

export default async function ProjectPage({ params, searchParams }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const { view, type } = parseWorkParams(await searchParams);
  const project = await getProject(projectId);
  const archived = project.status === "archived";
  const [plans, personas, analyses, syntheses, journeys] = await Promise.all([
    listPlans({ projectId: project.id }),
    listPersonas({ projectId: project.id }),
    listAnalyses({ projectId: project.id }),
    listSyntheses({ projectId: project.id }),
    listJourneys({ projectId: project.id }),
  ]);

  // Only what is filled in: an empty field is not worth a row of its own.
  const facts = [
    { icon: Shapes, label: "Project type", value: projectTypeLabel(project.project_type) },
    { icon: Building2, label: "Client", value: project.client },
    { icon: Factory, label: "Industry", value: project.industry },
    { icon: CalendarDays, label: "Created", value: formatDate(project.created_at) },
    { icon: Clock, label: "Last edited", value: formatRelativeTime(project.updated_at) },
  ].filter((f) => f.value);

  const brief = [
    { label: "Product or service", value: project.product_service },
    { label: "Target audience", value: project.target_audience },
    { label: "Research objectives", value: project.research_objectives },
  ].filter((b) => b.value);

  return (
    <>
      <PageHeader
        className="mb-6"
        backHref="/projects"
        backLabel="My Projects"
        title={project.name}
        meta={
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center">
              <dt className="sr-only">Status</dt>
              <dd><StatusBadge status={project.status} /></dd>
            </div>
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-1.5">
                <dt className="sr-only">{label}</dt>
                <Icon aria-hidden className="size-3.5 shrink-0" />
                <dd className="[overflow-wrap:anywhere]">{value}</dd>
              </div>
            ))}
          </dl>
        }
        description={project.description ? <span className="line-clamp-3 whitespace-pre-wrap">{project.description}</span> : undefined}
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
        <div role="status" className="mb-6 flex items-center gap-2.5 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          <Archive aria-hidden className="size-4 shrink-0" />
          This project is archived. Restore it from the actions menu to continue working on it.
        </div>
      )}

      {brief.length > 0 ? (
        <details className="group mb-8 border-y border-border">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm py-3 text-sm font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
            <span className="shrink-0 whitespace-nowrap">Project brief</span>
            <span className="truncate font-normal text-muted-foreground">{brief.map((b) => b.label).join(" · ")}</span>
          </summary>
          <dl className="grid gap-x-8 gap-y-4 pt-1 pb-5 sm:grid-cols-2 lg:grid-cols-3">
            {brief.map((b) => (
              <div key={b.label}>
                <dt className="text-xs text-muted-foreground">{b.label}</dt>
                <dd className="mt-0.5 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{b.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : (
        <p className="mb-8 border-y border-border py-3 text-sm text-muted-foreground">
          No brief yet. Personas and analyses reuse a project&apos;s product, audience and objectives.{" "}
          <Link href={`/projects/${project.id}/edit`} className="font-semibold text-primary-text hover:underline">
            Add a brief
          </Link>
        </p>
      )}

      <ProjectWork projectId={project.id} archived={archived} plans={plans} personas={personas} analyses={analyses} syntheses={syntheses} journeys={journeys} view={view} type={type} />
    </>
  );
}
