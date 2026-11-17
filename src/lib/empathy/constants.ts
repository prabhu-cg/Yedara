/** The four quadrants of the classic empathy map: Says and Thinks on top, Does and Feels below. */
export const QUADRANTS = ["says", "thinks", "does", "feels"] as const;
export type Quadrant = (typeof QUADRANTS)[number];

/**
 * Says and Does are what you observed; Thinks and Feels are what you infer. The classic cross puts the observed
 * quadrants in the left column and the inferred ones in the right, so the layout carries that distinction.
 */
export type Basis = "observed" | "inferred";

export const QUADRANT_INFO: Record<
  Quadrant,
  { label: string; basis: Basis; prompt: string; placeholder: string; addLabel: string; emptyHint: string }
> = {
  says: {
    label: "Says",
    basis: "observed",
    prompt: "What they said out loud. Use their own words.",
    placeholder: "A direct quote, e.g. “I never trust the estimate.”",
    addLabel: "Add what they say",
    emptyHint: "No quotes yet. A quote needs a source.",
  },
  thinks: {
    label: "Thinks",
    basis: "inferred",
    prompt: "What you infer is on their mind but not said.",
    placeholder: "e.g. This will take longer than I planned.",
    addLabel: "Add what they think",
    emptyHint: "Nothing inferred yet.",
  },
  does: {
    label: "Does",
    basis: "observed",
    prompt: "What you saw them do.",
    placeholder: "e.g. Scrolled back to compare the total.",
    addLabel: "Add what they do",
    emptyHint: "No behaviour recorded yet.",
  },
  feels: {
    label: "Feels",
    basis: "inferred",
    prompt: "The emotion you read in them, and why.",
    placeholder: "e.g. Anxious about hidden costs.",
    addLabel: "Add what they feel",
    emptyHint: "No feelings recorded yet.",
  },
};

export const BASIS_LABELS: Record<Basis, string> = { observed: "Observed", inferred: "Inferred" };

export const EMPATHY_LIMITS = { title: 160, subject: 120, context: 2000, itemChars: 500, note: 500, itemsPerMap: 200 } as const;

export const isQuadrant = (v: unknown): v is Quadrant => QUADRANTS.includes(v as Quadrant);

type ItemLike = { quadrant: string; observation_id: string | null };

/** How many notes each quadrant has, and how many of those cite an observation. */
export function quadrantCounts(items: readonly ItemLike[]) {
  const counts = Object.fromEntries(QUADRANTS.map((q) => [q, { notes: 0, evidenced: 0 }])) as Record<Quadrant, { notes: number; evidenced: number }>;
  for (const item of items) {
    if (!isQuadrant(item.quadrant)) continue;
    counts[item.quadrant].notes += 1;
    if (item.observation_id) counts[item.quadrant].evidenced += 1;
  }
  return counts;
}

/**
 * A map can be marked complete once every quadrant has at least one note or has been deliberately marked
 * "not yet researched". Unknown stays unknown: an empty quadrant is never silently complete.
 */
export function completionIssues(items: readonly ItemLike[], notResearched: readonly string[]): Quadrant[] {
  const counts = quadrantCounts(items);
  return QUADRANTS.filter((q) => counts[q].notes === 0 && !notResearched.includes(q));
}
