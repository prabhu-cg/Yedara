import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, Plus } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { EmpathyCard } from "@/components/empathy/empathy-card";
import { Button } from "@/components/ui/button";
import { listEmpathyMaps } from "@/lib/empathy/queries";

export const metadata: Metadata = { title: "Empathy Mapper" };

export default async function EmpathyMapperPage() {
  const maps = await listEmpathyMaps();
  return (
    <>
      <PageHeader
        title="Empathy Mapper"
        description="See what a person says, thinks, does and feels. Cite the observation behind each note, and mark what you haven't researched yet."
        actions={<Button asChild><Link href="/tools/empathy-mapper/new"><Plus /> New empathy map</Link></Button>}
      />
      {maps.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="No empathy maps yet"
          description="Choose a project and say who the map is about. A persona is optional. Then add what you observed and what you infer."
          action={<Button asChild variant="outline"><Link href="/tools/empathy-mapper/new"><Plus /> Start your first empathy map</Link></Button>}
        />
      ) : (
        <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {maps.map((m) => <EmpathyCard key={m.id} map={m} />)}
        </div>
      )}
    </>
  );
}
