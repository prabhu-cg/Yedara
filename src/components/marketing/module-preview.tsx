import { PreviewFigure } from "@/components/marketing/mockups/parts";
import { CompetitorsPreview } from "@/components/marketing/mockups/competitors";
import { JourneyPreview } from "@/components/marketing/mockups/journey";
import { OpportunityPreview } from "@/components/marketing/mockups/opportunity";
import { PersonaPreview } from "@/components/marketing/mockups/persona";
import { PlannerPreview } from "@/components/marketing/mockups/planner";
import { SynthesizerPreview } from "@/components/marketing/mockups/synthesizer";

const PREVIEWS: Record<string, () => React.JSX.Element> = {
  "research-planner": PlannerPreview,
  "persona-builder": PersonaPreview,
  "competitor-analyzer": CompetitorsPreview,
  "research-synthesizer": SynthesizerPreview,
  "journey-mapper": JourneyPreview,
  "opportunity-analyzer": OpportunityPreview,
};

export function ModulePreview({ slug, name, concept }: { slug: string; name: string; concept?: boolean }) {
  const Preview = PREVIEWS[slug];
  return (
    <PreviewFigure
      caption={
        concept
          ? `${name}: a concept sketch. The tool is in development.`
          : `${name}, illustrated with invented sample data.`
      }
    >
      <Preview />
    </PreviewFigure>
  );
}
