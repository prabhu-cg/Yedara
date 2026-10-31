import type { Metadata } from "next";
import { PlannerWizard } from "@/components/research-planner/wizard";
import { clampStep } from "@/lib/research-planner/constants";
import { getPlanBundle, listProjectOptions } from "@/lib/research-planner/queries";

export const metadata: Metadata = { title: "Research plan" };

export default async function PlanPage({ params, searchParams }: PageProps<"/tools/research-planner/[planId]">) {
  const { planId } = await params;
  const query = await searchParams;
  const [bundle, options] = await Promise.all([getPlanBundle(planId), listProjectOptions()]);

  // An archived project isn't offered for new plans, but must still show for this one.
  const projects = options.some((p) => p.id === bundle.plan.project_id) || !bundle.project
    ? options
    : [...options, { id: bundle.project.id, name: bundle.project.name, client: bundle.project.client, industry: bundle.project.industry }];

  const initialSections = Object.fromEntries(Object.entries(bundle.sections).map(([key, s]) => [key, s.content]));
  const initialMeta = Object.fromEntries(
    Object.entries(bundle.sections).map(([key, s]) => [key, { position: s.position, source: s.source }]),
  );

  return (
    <PlannerWizard
      planId={bundle.plan.id}
      initialTitle={bundle.plan.title}
      initialProjectId={bundle.plan.project_id}
      initialStatus={bundle.plan.status}
      initialStep={typeof query.step === "string" ? clampStep(query.step) : clampStep(bundle.plan.current_step)}
      initialSections={initialSections}
      initialMeta={initialMeta}
      projects={projects}
      preparedBy={bundle.preparedBy}
      updatedAt={bundle.plan.updated_at}
    />
  );
}
