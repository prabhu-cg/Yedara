import type { Metadata } from "next";
import { JourneyWorkspace } from "@/components/journeys/journey-workspace";
import { isJourneyTab } from "@/lib/journeys/constants";
import { getJourneyBundle } from "@/lib/journeys/queries";
import { loadAvatarIds } from "@/lib/personas/queries";
import { listEvidenceOptions } from "@/lib/synthesizer/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Journey map" };

export default async function JourneyPage({ params, searchParams }: PageProps<"/tools/journey-mapper/[journeyId]">) {
  const { journeyId } = await params;
  const query = await searchParams;
  const bundle = await getJourneyBundle(journeyId);

  const supabase = await createClient();
  const [{ data: personas }, evidenceOptions] = await Promise.all([
    supabase.from("personas").select("id, name").eq("project_id", bundle.journey.project_id).order("name").limit(200),
    listEvidenceOptions(bundle.journey.project_id),
  ]);

  const avatars = await loadAvatarIds(supabase, (personas ?? []).map((p) => p.id));

  return (
    <JourneyWorkspace
      journeyId={bundle.journey.id}
      initialMeta={{ name: bundle.journey.name, scenario: bundle.journey.scenario ?? "", journeyType: bundle.journey.journey_type, state: bundle.journey.state, personaId: bundle.journey.persona_id ?? "" }}
      initialStatus={bundle.journey.status}
      initialTab={isJourneyTab(query.tab) ? query.tab : bundle.stages.length ? "map" : "edit"}
      project={bundle.project ? { id: bundle.project.id, name: bundle.project.name } : null}
      personas={(personas ?? []).map((p) => ({ ...p, avatar: avatars.get(p.id) ?? "" }))}
      initialStages={bundle.stages}
      initialItems={bundle.items}
      initialCandidates={bundle.candidates}
      evidenceOptions={evidenceOptions}
    />
  );
}
