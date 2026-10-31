import type { Metadata } from "next";
import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { NewPersonaForm } from "@/components/personas/new-persona-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listProjectOptions } from "@/lib/research-planner/queries";

export const metadata: Metadata = { title: "New persona" };

export default async function NewPersonaPage({ searchParams }: PageProps<"/tools/persona-builder/new">) {
  const params = await searchParams;
  const projects = await listProjectOptions();
  return (
    <>
      <PageHeader backHref="/tools/persona-builder" backLabel="Personas" title="New persona" description="Name the persona, choose its project, and say how much evidence it rests on." />
      {projects.length === 0 ? (
        <EmptyState icon={FolderPlus} title="Create a project first" description="Every persona belongs to a project. Create one, then come back." action={<Button asChild variant="outline"><Link href="/projects/new">Create a project</Link></Button>} />
      ) : (
        <Card className="max-w-3xl">
          <CardContent className="pt-5 sm:pt-6">
            <NewPersonaForm projects={projects} defaultProjectId={typeof params.project === "string" ? params.project : undefined} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
