import type { Metadata } from "next";
import { NewEmpathyPanel, projectParam } from "@/components/forms/form-panels";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New empathy map" };

export default async function Page({ searchParams }: PageProps<"/tools/empathy-mapper/new">) {
  const params = await searchParams;
  return (
    <>
      <PageHeader backHref="/tools/empathy-mapper" backLabel="Empathy maps" title="New empathy map" description="Choose the project, say who the map is about, and describe the situation. A persona is optional." />
      <Card className="max-w-3xl">
        <CardContent className="pt-5 sm:pt-6">
          <NewEmpathyPanel defaultProjectId={projectParam(params)} />
        </CardContent>
      </Card>
    </>
  );
}
