import type { Metadata } from "next";
import { PersonaWizard } from "@/components/personas/persona-wizard";
import { clampPersonaStep } from "@/lib/personas/constants";
import { getPersonaBundle, PROJECT_BRIEF_COLUMNS, toProject } from "@/lib/personas/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Persona" };

export default async function PersonaPage({ params, searchParams }: PageProps<"/tools/persona-builder/[personaId]">) {
  const { personaId } = await params;
  const query = await searchParams;
  const bundle = await getPersonaBundle(personaId);

  const supabase = await createClient();
  const { data } = await supabase.from("projects").select(PROJECT_BRIEF_COLUMNS).neq("status", "archived").order("name").limit(200);
  const projects = (data ?? []).map(toProject);
  // An archived project isn't offered for new work, but must still show for this persona.
  if (bundle.project && !projects.some((p) => p.id === bundle.project!.id)) projects.push(bundle.project);

  return (
    <PersonaWizard
      personaId={bundle.persona.id}
      initialName={bundle.persona.name}
      initialProjectId={bundle.persona.project_id}
      initialType={bundle.persona.persona_type}
      initialStatus={bundle.persona.status}
      initialStep={typeof query.step === "string" ? clampPersonaStep(query.step) : clampPersonaStep(bundle.persona.current_step)}
      initialContent={bundle.content}
      initialEvidence={bundle.evidence}
      projects={projects}
      preparedBy={bundle.preparedBy}
      updatedAt={bundle.persona.updated_at}
    />
  );
}
