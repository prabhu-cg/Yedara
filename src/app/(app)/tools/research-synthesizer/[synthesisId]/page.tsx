import type { Metadata } from "next";
import { SynthesisWorkspace } from "@/components/synthesizer/synthesis-workspace";
import { isSynthesisTab } from "@/lib/synthesizer/constants";
import { getSynthesisBundle } from "@/lib/synthesizer/queries";

export const metadata: Metadata = { title: "Research synthesis" };

export default async function SynthesisPage({ params, searchParams }: PageProps<"/tools/research-synthesizer/[synthesisId]">) {
  const { synthesisId } = await params;
  const query = await searchParams;
  const bundle = await getSynthesisBundle(synthesisId);

  return (
    <SynthesisWorkspace
      synthesisId={bundle.synthesis.id}
      initialTitle={bundle.synthesis.title}
      initialStatus={bundle.synthesis.status}
      initialTab={isSynthesisTab(query.tab) ? query.tab : "material"}
      project={bundle.project ? { id: bundle.project.id, name: bundle.project.name, client: bundle.project.client } : null}
      preparedBy={bundle.preparedBy}
      updatedAt={bundle.synthesis.updated_at}
      sources={bundle.sources}
      observations={bundle.observations}
      themes={bundle.themes}
      cards={bundle.cards}
      boardZoom={bundle.boardZoom}
      insights={bundle.insights}
      report={bundle.report}
    />
  );
}
