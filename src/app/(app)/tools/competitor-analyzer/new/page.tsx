import type { Metadata } from "next";
import { NewAnalysisPanel, projectParam } from "@/components/forms/form-panels";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New competitor analysis" };

export default async function Page({ searchParams }: PageProps<"/tools/competitor-analyzer/new">) {
  const params = await searchParams;
  return (
    <>
      <PageHeader backHref="/tools/competitor-analyzer" backLabel="Competitor analyses" title="New competitor analysis" description="Name the analysis and choose the project whose context it should reuse." />
      <Card className="max-w-3xl">
        <CardContent className="pt-5 sm:pt-6">
          <NewAnalysisPanel defaultProjectId={projectParam(params)} />
        </CardContent>
      </Card>
    </>
  );
}
