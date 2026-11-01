import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Route } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { JourneyCard } from "@/components/journeys/journey-card";
import { Button } from "@/components/ui/button";
import { listJourneys } from "@/lib/journeys/queries";

export const metadata: Metadata = { title: "Journey Mapper" };

export default async function JourneyMapperPage() {
  const journeys = await listJourneys();
  return (
    <>
      <PageHeader
        title="Journey Mapper"
        description="Map an experience end to end: stages, what people do and feel, where it goes wrong, and where it could be better. Link pain points to evidence."
        actions={<Button asChild><Link href="/tools/journey-mapper/new"><Plus /> New journey</Link></Button>}
      />
      {journeys.length === 0 ? (
        <EmptyState
          icon={Route}
          title="No journey maps yet"
          description="Choose a project and, if you have one, a persona. Then lay out the stages of the experience and fill in what you know."
          action={<Button asChild variant="outline"><Link href="/tools/journey-mapper/new"><Plus /> Start your first journey</Link></Button>}
        />
      ) : (
        <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {journeys.map((j) => <JourneyCard key={j.id} journey={j} />)}
        </div>
      )}
    </>
  );
}
