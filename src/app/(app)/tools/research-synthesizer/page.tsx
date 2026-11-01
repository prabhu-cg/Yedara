import type { Metadata } from "next";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SynthesisCard } from "@/components/synthesizer/synthesis-card";
import { Button } from "@/components/ui/button";
import { listSyntheses } from "@/lib/synthesizer/queries";

export const metadata: Metadata = { title: "Research Synthesizer" };

export default async function ResearchSynthesizerPage() {
  const syntheses = await listSyntheses();
  return (
    <>
      <PageHeader
        title="Research Synthesizer"
        description="Turn interview notes and observations into themes, evidence-backed insights and a report. Every insight points back to the observations it rests on."
        actions={<Button asChild><Link href="/tools/research-synthesizer/new"><Plus /> New synthesis</Link></Button>}
      />
      {syntheses.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No syntheses yet"
          description="Add the notes and observations you collected, group them on an affinity board, then write insights that cite their evidence. Nothing is generated for you, and nothing is sent anywhere."
          action={<Button asChild variant="outline"><Link href="/tools/research-synthesizer/new"><Plus /> Start your first synthesis</Link></Button>}
        />
      ) : (
        <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {syntheses.map((s) => <SynthesisCard key={s.id} synthesis={s} />)}
        </div>
      )}
    </>
  );
}
