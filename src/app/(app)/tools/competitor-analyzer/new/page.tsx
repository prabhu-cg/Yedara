import type { Metadata } from "next";
import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { NewAnalysisForm } from "@/components/competitors/new-analysis-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listProjectOptions } from "@/lib/research-planner/queries";

export const metadata: Metadata = { title: "New competitor analysis" };

export default async function NewAnalysisPage({ searchParams }: PageProps<"/tools/competitor-analyzer/new">) {
  const params = await searchParams;
  const projects = await listProjectOptions();
  return (
    <>
      <PageHeader backHref="/tools/competitor-analyzer" backLabel="Competitor analyses" title="New competitor analysis" description="Name the analysis and choose the project whose context it should reuse." />
      {projects.length === 0 ? (
        <EmptyState icon={FolderPlus} title="Create a project first" description="Every analysis belongs to a project. Create one, then come back." action={<Button asChild variant="outline"><Link href="/projects/new">Create a project</Link></Button>} />
      ) : (
        <Card className="max-w-3xl">
          <CardContent className="pt-5 sm:pt-6">
            <NewAnalysisForm projects={projects} defaultProjectId={typeof params.project === "string" ? params.project : undefined} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
