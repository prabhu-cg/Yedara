import type { Metadata } from "next";
import { AnalysisWizard } from "@/components/competitors/analysis-wizard";
import { clampCompetitorStep } from "@/lib/competitors/constants";
import { getAnalysisBundle } from "@/lib/competitors/queries";
import { PROJECT_BRIEF_COLUMNS, toProject } from "@/lib/personas/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Competitor analysis" };

export default async function AnalysisPage({ params, searchParams }: PageProps<"/tools/competitor-analyzer/[analysisId]">) {
  const { analysisId } = await params;
  const query = await searchParams;
  const bundle = await getAnalysisBundle(analysisId);

  const supabase = await createClient();
  const { data } = await supabase.from("projects").select(PROJECT_BRIEF_COLUMNS).neq("status", "archived").order("name").limit(200);
  const projects = (data ?? []).map(toProject);
  // An archived project isn't offered for new work, but must still show for this analysis.
  if (bundle.project && !projects.some((p) => p.id === bundle.project!.id)) projects.push(bundle.project);

  return (
    <AnalysisWizard
      analysisId={bundle.analysis.id}
      initialTitle={bundle.analysis.title}
      initialProjectId={bundle.analysis.project_id}
      initialStatus={bundle.analysis.status}
      initialStep={typeof query.step === "string" ? clampCompetitorStep(query.step) : clampCompetitorStep(bundle.analysis.current_step)}
      initialMarket={bundle.market}
      initialContent={bundle.content}
      initialCompetitors={bundle.competitors}
      initialCriteria={bundle.criteria}
      initialCells={bundle.cells}
      initialSources={bundle.sources}
      projects={projects}
      preparedBy={bundle.preparedBy}
      updatedAt={bundle.analysis.updated_at}
    />
  );
}
