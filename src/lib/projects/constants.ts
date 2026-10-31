import type { ProjectStatus } from "@/lib/supabase/database.types";

export const PROJECT_STATUSES = [
  "planning",
  "in_progress",
  "review",
  "completed",
  "archived",
] as const satisfies readonly ProjectStatus[];

/** Statuses a user can pick in the form. Archiving has its own action. */
export const EDITABLE_STATUSES = ["planning", "in_progress", "review", "completed"] as const;

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
  archived: "Archived",
};

export const PROJECT_TYPES = [
  { value: "ux_research", label: "UX research" },
  { value: "ux_ui_design", label: "UX/UI design" },
  { value: "product_discovery", label: "Product discovery" },
  { value: "website_redesign", label: "Website redesign" },
  { value: "mobile_app", label: "Mobile app" },
  { value: "service_design", label: "Service design" },
  { value: "usability_testing", label: "Usability testing" },
  { value: "other", label: "Other" },
] as const;

export const PROJECT_TYPE_VALUES = PROJECT_TYPES.map((t) => t.value) as [
  (typeof PROJECT_TYPES)[number]["value"],
  ...(typeof PROJECT_TYPES)[number]["value"][],
];

export const INDUSTRY_SUGGESTIONS = [
  "SaaS",
  "Fintech",
  "Healthcare",
  "E-commerce",
  "Education",
  "Travel & hospitality",
  "Media & entertainment",
  "Government",
  "Non-profit",
  "Other",
] as const;

export function projectTypeLabel(value: string) {
  return PROJECT_TYPES.find((t) => t.value === value)?.label ?? "Other";
}

/** Status filter values used in the projects list URL. */
export const STATUS_FILTERS = ["active", "all", ...PROJECT_STATUSES] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];
export const DEFAULT_STATUS_FILTER: StatusFilter = "active";
