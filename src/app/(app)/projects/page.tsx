import type { Metadata } from "next";
import Link from "next/link";
import { FolderPlus, Plus, SearchX } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectFilters } from "@/components/projects/project-filters";
import { Button } from "@/components/ui/button";
import { DEFAULT_STATUS_FILTER } from "@/lib/projects/constants";
import { listProjects, parseStatusFilter } from "@/lib/projects/queries";

export const metadata: Metadata = { title: "My Projects" };

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const status = parseStatusFilter(typeof params.status === "string" ? params.status : undefined);

  const projects = await listProjects({ q, status });
  const isFiltered = q.trim() !== "" || status !== DEFAULT_STATUS_FILTER;

  return (
    <>
      <PageHeader
        title="My Projects"
        description="All your research projects in one place."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus /> New project
            </Link>
          </Button>
        }
      />

      <ProjectFilters q={q} status={status} />

      <p aria-live="polite" className="sr-only">
        {projects.length} {projects.length === 1 ? "project" : "projects"} found
      </p>

      {projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : isFiltered ? (
        <EmptyState
          icon={SearchX}
          title="No projects match your filters"
          description="Try a different search term or status."
          action={
            <Button asChild variant="outline">
              <Link href="/projects">Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={FolderPlus}
          title="No projects yet"
          description="Create a project to start organising your research."
          action={
            <Button asChild>
              <Link href="/projects/new">
                <Plus /> Create project
              </Link>
            </Button>
          }
        />
      )}
    </>
  );
}
