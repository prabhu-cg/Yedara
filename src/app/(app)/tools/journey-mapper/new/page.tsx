import type { Metadata } from "next";
import { NewJourneyPanel, projectParam } from "@/components/forms/form-panels";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New journey map" };

export default async function Page({ searchParams }: PageProps<"/tools/journey-mapper/new">) {
  const params = await searchParams;
  return (
    <>
      <PageHeader backHref="/tools/journey-mapper" backLabel="Journey maps" title="New journey map" description="Choose the project and persona, name the journey, and say whether it is how things work today or how they should." />
      <Card className="max-w-3xl">
        <CardContent className="pt-5 sm:pt-6">
          <NewJourneyPanel defaultProjectId={projectParam(params)} />
        </CardContent>
      </Card>
    </>
  );
}
