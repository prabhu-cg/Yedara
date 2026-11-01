import type { Metadata } from "next";
import { NewSynthesisPanel, projectParam } from "@/components/forms/form-panels";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New research synthesis" };

export default async function Page({ searchParams }: PageProps<"/tools/research-synthesizer/new">) {
  const params = await searchParams;
  return (
    <>
      <PageHeader backHref="/tools/research-synthesizer" backLabel="Research syntheses" title="New research synthesis" description="Name the synthesis and choose its project. You add the research material next." />
      <Card className="max-w-3xl">
        <CardContent className="pt-5 sm:pt-6">
          <NewSynthesisPanel defaultProjectId={projectParam(params)} />
        </CardContent>
      </Card>
    </>
  );
}
