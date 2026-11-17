import type { Metadata } from "next";
import { EmpathyWorkspace } from "@/components/empathy/empathy-workspace";
import { getEmpathyBundle } from "@/lib/empathy/queries";
import { loadAvatarIds } from "@/lib/personas/queries";
import { listEvidenceOptions } from "@/lib/synthesizer/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Empathy map" };

export default async function EmpathyMapPage({ params }: PageProps<"/tools/empathy-mapper/[mapId]">) {
  const { mapId } = await params;
  const bundle = await getEmpathyBundle(mapId);

  const supabase = await createClient();
  const [{ data: personas }, evidenceOptions] = await Promise.all([
    supabase.from("personas").select("id, name").eq("project_id", bundle.map.project_id).order("name").limit(200),
    listEvidenceOptions(bundle.map.project_id),
  ]);
  const avatars = await loadAvatarIds(supabase, (personas ?? []).map((p) => p.id));

  return (
    <EmpathyWorkspace
      mapId={bundle.map.id}
      initialMeta={{ title: bundle.map.title, subject: bundle.map.subject ?? "", context: bundle.map.context ?? "", personaId: bundle.map.persona_id ?? "" }}
      initialStatus={bundle.map.status}
      initialNotResearched={bundle.map.not_researched ?? []}
      project={bundle.project ? { id: bundle.project.id, name: bundle.project.name } : null}
      personas={(personas ?? []).map((p) => ({ ...p, avatar: avatars.get(p.id) ?? "" }))}
      initialItems={bundle.items}
      evidenceOptions={evidenceOptions}
    />
  );
}
