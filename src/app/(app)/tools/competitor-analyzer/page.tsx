import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Swords } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { AnalysisCard } from "@/components/competitors/analysis-card";
import { Button } from "@/components/ui/button";
import { listAnalyses } from "@/lib/competitors/queries";

export const metadata: Metadata = { title: "Competitor Analyzer" };

export default async function CompetitorAnalyzerPage() {
  const analyses = await listAnalyses();
  return (
    <>
      <PageHeader
        title="Competitor Analyzer"
        description="Compare competitors on criteria you choose, with a source for every claim and an honest record of what you couldn't find."
        actions={
          <Button asChild>
            <Link href="/tools/competitor-analyzer/new"><Plus /> New analysis</Link>
          </Button>
        }
      />
      {analyses.length === 0 ? (
        <EmptyState
          icon={Swords}
          title="No competitor analyses yet"
          description="Add the competitors you know about, choose what to compare, and fill in the matrix from your own research. Unknown stays unknown: it is never counted against a competitor."
          action={<Button asChild variant="outline"><Link href="/tools/competitor-analyzer/new"><Plus /> Start your first analysis</Link></Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {analyses.map((a) => <AnalysisCard key={a.id} analysis={a} />)}
        </div>
      )}
    </>
  );
}
