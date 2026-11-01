import type { ItemKind } from "@/lib/journeys/constants";
import { CONVERTIBLE_KINDS } from "@/lib/journeys/constants";

/**
 * The record handed to the Opportunity Analyzer. Journey and stage names are copied as they are
 * now, so the origin is still readable if the stage is later renamed or removed.
 */
export function candidateFromItem(
  item: { id: string; kind: string; content: string; evidence_note: string | null; observation_id: string | null },
  stage: { id: string; name: string },
  journey: { id: string; name: string; project_id: string },
) {
  if (!(CONVERTIBLE_KINDS as readonly string[]).includes(item.kind)) return null;
  return {
    project_id: journey.project_id,
    journey_id: journey.id,
    stage_id: stage.id,
    source_item_id: item.id,
    observation_id: item.observation_id,
    title: item.content.trim().slice(0, 300),
    origin_kind: item.kind as Extract<ItemKind, "pain_point" | "opportunity">,
    journey_name: journey.name.slice(0, 160),
    stage_name: stage.name.slice(0, 80),
    evidence_note: item.evidence_note?.trim() ? item.evidence_note.trim().slice(0, 500) : null,
  };
}
