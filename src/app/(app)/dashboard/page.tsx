import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FolderPlus, LayoutTemplate, Plus, Wrench } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectCard } from "@/components/projects/project-card";
import { StatusBadge } from "@/components/projects/status-badge";
import { ToolCard } from "@/components/tools/tool-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { researchTools } from "@/config/tools";
import { siteConfig } from "@/config/site";
import { displayName, getProfile, requireUser } from "@/lib/auth/dal";
import { formatRelativeTime } from "@/lib/format";
import { PROJECT_STATUSES } from "@/lib/projects/constants";
import { getDashboardData } from "@/lib/projects/queries";

export const metadata: Metadata = { title: "Dashboard" };

const ONBOARDING_STEPS = [
  {
    icon: FolderPlus,
    title: "Create a project",
    body: "Give your research a home: a name, the client and the type of work.",
    href: "/projects/new",
    cta: "New project",
  },
  {
    icon: Wrench,
    title: "Meet the research tools",
    body: "Planner, personas, competitors, journeys, synthesis and opportunities are on the way.",
    href: "/tools",
    cta: "View tools",
  },
  {
    icon: LayoutTemplate,
    title: "Browse templates",
    body: "Start from proven structures once templates land.",
    href: "/templates",
    cta: "See templates",
  },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const [profile, { recent, recentlyEdited, statusCounts, total }] = await Promise.all([
    getProfile(),
    getDashboardData(),
  ]);
  const firstName = displayName(profile, user.email).split(" ")[0];
  const isNewUser = total === 0;

  return (
    <>
      <PageHeader
        title={isNewUser ? `Welcome to ${siteConfig.name}, ${firstName}` : `Welcome back, ${firstName}`}
        description={
          isNewUser
            ? "Let's set up your research workspace. Start with a project."
            : "Pick up where you left off, or start something new."
        }
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus /> Create new project
            </Link>
          </Button>
        }
      />

      {isNewUser ? (
        <section aria-labelledby="getting-started" className="mb-12 space-y-6">
          <EmptyState
            icon={FolderPlus}
            title="You don't have any projects yet"
            description="Projects keep your research organised. Create your first one to get started."
            action={
              <Button asChild>
                <Link href="/projects/new">
                  <Plus /> Create your first project
                </Link>
              </Button>
            }
          />
          <div>
            <h2 id="getting-started" className="mb-4 text-lg font-semibold">
              Getting started
            </h2>
            <ol className="grid gap-4 md:grid-cols-3">
              {ONBOARDING_STEPS.map((step, index) => (
                <li key={step.title}>
                  <Card className="h-full">
                    <CardHeader className="gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                          {index + 1}
                        </span>
                        <step.icon aria-hidden className="size-5 text-muted-foreground" />
                      </div>
                      <CardTitle>{step.title}</CardTitle>
                      <CardDescription>{step.body}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link
                        href={step.href}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                      >
                        {step.cta} <ArrowRight aria-hidden className="size-4" />
                      </Link>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : (
        <>
          <section aria-labelledby="status-heading" className="mb-10">
            <h2 id="status-heading" className="mb-3 text-lg font-semibold">
              Project status
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {PROJECT_STATUSES.map((status) => (
                <li key={status}>
                  <Link
                    href={`/projects?status=${status}`}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 outline-none transition-colors hover:border-input hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <StatusBadge status={status} className="w-fit" />
                    <span className="text-2xl font-bold">{statusCounts[status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="recent-heading" className="mb-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="recent-heading" className="text-lg font-semibold">
                Recent projects
              </h2>
              <Link href="/projects" className="text-sm font-semibold text-primary hover:underline">
                View all
              </Link>
            </div>
            {recent.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {recent.slice(0, 3).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FolderPlus}
                title="No active projects"
                description="Everything is archived. Create a new project or restore an archived one."
                action={
                  <Button asChild variant="outline">
                    <Link href="/projects?status=archived">View archived</Link>
                  </Button>
                }
              />
            )}
          </section>

          {recentlyEdited.length > 0 && (
            <section aria-labelledby="edited-heading" className="mb-10">
              <h2 id="edited-heading" className="mb-3 text-lg font-semibold">
                Recently edited
              </h2>
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {recentlyEdited.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 outline-none first:rounded-t-xl last:rounded-b-xl hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0 truncate font-semibold">{project.name}</span>
                      <span className="flex shrink-0 items-center gap-3">
                        <StatusBadge status={project.status} className="hidden sm:inline-flex" />
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(project.updated_at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <section aria-labelledby="tools-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="tools-heading" className="text-lg font-semibold">
            Research tools
          </h2>
          <Link href="/tools" className="text-sm font-semibold text-primary hover:underline">
            All tools
          </Link>
        </div>
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
