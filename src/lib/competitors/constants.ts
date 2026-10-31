export const COMPETITOR_TYPES = ["direct", "indirect", "substitute", "emerging"] as const;
export type CompetitorType = (typeof COMPETITOR_TYPES)[number];

export const COMPETITOR_TYPE_INFO: Record<CompetitorType, { label: string; help: string; badge: "default" | "info" | "secondary" | "warning" }> = {
  direct: { label: "Direct", help: "Offers a similar product to the same audience.", badge: "default" },
  indirect: { label: "Indirect", help: "Solves the same problem in a different way.", badge: "info" },
  substitute: { label: "Substitute", help: "Something people use instead, such as spreadsheets or doing nothing.", badge: "secondary" },
  emerging: { label: "Emerging", help: "New or growing, and likely to matter soon.", badge: "warning" },
};

export const CRITERIA_CATEGORIES = [
  "core_features",
  "capabilities",
  "pricing",
  "user_experience",
  "accessibility",
  "integrations",
  "support",
  "positioning",
  "target_audience",
  "custom",
] as const;
export type CriteriaCategory = (typeof CRITERIA_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<CriteriaCategory, string> = {
  core_features: "Core features",
  capabilities: "Product capabilities",
  pricing: "Pricing",
  user_experience: "User experience",
  accessibility: "Accessibility",
  integrations: "Integrations",
  support: "Customer support",
  positioning: "Positioning",
  target_audience: "Target audience",
  custom: "Custom",
};

/** One suggested criterion per category. Users add any of them, or define their own. */
export const SUGGESTED_CRITERIA = CRITERIA_CATEGORIES.filter((c) => c !== "custom").map((category) => ({
  category,
  name: CATEGORY_LABELS[category],
}));

/** A cell is never just empty: "unknown" and "unavailable" are recorded facts about the research. */
export const CELL_STATUSES = ["known", "unknown", "unavailable", "not_applicable"] as const;
export type CellStatus = (typeof CELL_STATUSES)[number];
export const CELL_STATUS_LABELS: Record<CellStatus, string> = {
  known: "Known",
  unknown: "Unknown (not yet researched)",
  unavailable: "Not publicly available",
  not_applicable: "Not applicable",
};
/** Short form for tight spaces such as matrix cells and exports. */
export const CELL_STATUS_SHORT: Record<CellStatus, string> = {
  known: "Known",
  unknown: "Unknown",
  unavailable: "Not publicly available",
  not_applicable: "N/A",
};

export const SOURCE_TYPES = ["website", "pricing_page", "product_page", "review", "article", "interview", "other"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];
export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  website: "Website",
  pricing_page: "Pricing page",
  product_page: "Product page",
  review: "Review",
  article: "Article",
  interview: "Interview",
  other: "Other",
};

export const ORIGIN_LABELS = { manual: "Manual", automated: "Automated", ai: "AI interpretation" } as const;
export type Origin = keyof typeof ORIGIN_LABELS;

export const COMPETITOR_STEPS = [
  { id: 1, slug: "market", title: "Market context", short: "Market", description: "Define the market you are analysing and why." },
  { id: 2, slug: "competitors", title: "Competitors", short: "Competitors", description: "Add the products and companies to compare." },
  { id: 3, slug: "criteria", title: "Comparison criteria", short: "Criteria", description: "Choose what to compare them on." },
  { id: 4, slug: "matrix", title: "Comparison matrix", short: "Matrix", description: "Fill in what you know, with sources." },
  { id: 5, slug: "analysis", title: "Analysis", short: "Analysis", description: "Interpret the matrix: strengths, gaps and opportunities." },
  { id: 6, slug: "report", title: "Report", short: "Report", description: "Review the report, then preview and export it." },
] as const;

export const COMPETITOR_TOTAL_STEPS = COMPETITOR_STEPS.length;
export const COMPETITOR_REPORT_STEP = 6;

export const UNNAMED_COMPETITOR = "Untitled competitor";

export function clampCompetitorStep(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= COMPETITOR_TOTAL_STEPS ? n : 1;
}
