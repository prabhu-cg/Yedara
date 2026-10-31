import type { Metadata } from "next";
import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { NewPlanForm } from "@/components/research-planner/new-plan-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listProjectOptions } from "@/lib/research-planner/queries";

export const metadata: Metadata = { title: "New research plan" };

export default async function NewPlanPage({ searchParams }: PageProps<"/tools/research-planner/new">) {
  const params = await searchParams;
  const projects = await listProjectOptions();
  const defaultProjectId = typeof params.project === "string" ? params.project : undefined;

  return (
    <>
      <PageHeader
        backHref="/tools/research-planner"
        backLabel="Research plans"
        title="New research plan"
        description="Name your research and choose the project it belongs to. You'll fill in the rest step by step."
      />
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="Create a project first"
          description="Every research plan belongs to a project. Create one, then come back to start planning."
          action={
            <Button asChild>
              <Link href="/projects/new">Create a project</Link>
            </Button>
          }
        />
      ) : (
        <Card className="max-w-2xl">
          <CardContent className="pt-5 sm:pt-6">
            <NewPlanForm projects={projects} defaultProjectId={defaultProjectId} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
