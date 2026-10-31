import type { Metadata } from "next";
import { NewPlanPanel, projectParam } from "@/components/forms/form-panels";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New research plan" };

export default async function Page({ searchParams }: PageProps<"/tools/research-planner/new">) {
  const params = await searchParams;
  return (
    <>
      <PageHeader backHref="/tools/research-planner" backLabel="Research plans" title="New research plan" description="Name your research and choose the project it belongs to. You'll fill in the rest step by step." />
      <Card className="max-w-2xl">
        <CardContent className="pt-5 sm:pt-6">
          <NewPlanPanel defaultProjectId={projectParam(params)} />
        </CardContent>
      </Card>
    </>
  );
}
