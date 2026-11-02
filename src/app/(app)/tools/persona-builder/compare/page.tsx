import type { Metadata } from "next";
import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { CompareView } from "@/components/personas/compare-view";
import { PersonaAvatar } from "@/components/personas/persona-avatar";
import { PersonaTypeBadge } from "@/components/personas/persona-type";
import { Button } from "@/components/ui/button";
import { listPersonas, loadPersonasForComparison } from "@/lib/personas/queries";

export const metadata: Metadata = { title: "Compare personas" };

export default async function ComparePersonasPage({ searchParams }: PageProps<"/tools/persona-builder/compare">) {
  const params = await searchParams;
  const raw = params.ids;
  const ids = (Array.isArray(raw) ? raw : raw ? [raw] : []).flatMap((v) => v.split(",")).filter(Boolean);

  const [all, selected] = await Promise.all([listPersonas(), loadPersonasForComparison(ids)]);
  const chosen = new Set(selected.map((b) => b.persona.id));

  return (
    <>
      <PageHeader backHref="/tools/persona-builder" backLabel="Personas" title="Compare personas" description="Choose two to four personas to see how they differ. Persona types are shown so a hypothesis isn't weighed like research." />

      {all.length === 0 ? (
        <EmptyState icon={GitCompareArrows} title="Nothing to compare yet" description="Create at least two personas first." action={<Button asChild variant="outline"><Link href="/tools/persona-builder/new">New persona</Link></Button>} />
      ) : (
        <>
          <form method="get" className="mb-6 rounded-card border border-border bg-card p-5 shadow-card">
            <fieldset>
              <legend className="mb-3 text-sm font-semibold">Personas to compare (up to 4)</legend>
              <ul className="grid gap-2 sm:grid-cols-2">
                {all.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted has-[:checked]:border-primary">
                      <input type="checkbox" name="ids" value={p.id} defaultChecked={chosen.has(p.id)} className="size-4 accent-[var(--primary)]" />
                      <PersonaAvatar avatarId={p.avatar} name={p.name} decorative className="size-7 text-[11px]" />
                      <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                      <PersonaTypeBadge type={p.persona_type} />
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <Button type="submit" variant="outline" size="sm" className="mt-4">Compare selected</Button>
          </form>

          {selected.length === 0 ? (
            <p className="text-sm text-muted-foreground">Select at least one persona above.</p>
          ) : (
            <CompareView
              personas={selected.map((b) => ({ id: b.persona.id, name: b.persona.name, type: b.persona.persona_type, projectName: b.project?.name ?? null, content: b.content, evidence: b.evidence }))}
            />
          )}
        </>
      )}
    </>
  );
}
