import type { Metadata } from "next";
import { NewPersonaPanel, projectParam } from "@/components/forms/form-panels";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New persona" };

export default async function Page({ searchParams }: PageProps<"/tools/persona-builder/new">) {
  const params = await searchParams;
  return (
    <>
      <PageHeader backHref="/tools/persona-builder" backLabel="Personas" title="New persona" description="Name the persona, choose its project, and say how much evidence it rests on." />
      <Card className="max-w-3xl">
        <CardContent className="pt-5 sm:pt-6">
          <NewPersonaPanel defaultProjectId={projectParam(params)} />
        </CardContent>
      </Card>
    </>
  );
}
