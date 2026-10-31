import type { Metadata } from "next";
import Link from "next/link";
import { GitCompareArrows, Plus, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PersonaCard } from "@/components/personas/persona-card";
import { Button } from "@/components/ui/button";
import { listPersonas } from "@/lib/personas/queries";

export const metadata: Metadata = { title: "Persona Builder" };

export default async function PersonaBuilderPage() {
  const personas = await listPersonas();
  return (
    <>
      <PageHeader
        title="Persona Builder"
        description="Create structured, editable personas and keep their evidence honest: research-backed, hypothesis or proto-persona."
        actions={
          <>
            {personas.length > 1 && (
              <Button asChild variant="outline">
                <Link href="/tools/persona-builder/compare"><GitCompareArrows /> Compare</Link>
              </Button>
            )}
            <Button asChild>
              <Link href="/tools/persona-builder/new"><Plus /> New persona</Link>
            </Button>
          </>
        }
      />
      {personas.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No personas yet"
          description="Start with a hypothesis if you haven't done research yet, or build a research-backed persona from interviews and observations. Each persona shows how much evidence stands behind it."
          action={<Button asChild variant="outline"><Link href="/tools/persona-builder/new"><Plus /> Create your first persona</Link></Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {personas.map((p) => <PersonaCard key={p.id} persona={p} />)}
        </div>
      )}
    </>
  );
}
