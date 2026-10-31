import { z } from "zod";
import { EDITABLE_STATUSES, PROJECT_TYPE_VALUES } from "@/lib/projects/constants";

export const projectFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(120, "Use 120 characters or fewer"),
  description: z.string().trim().max(2000, "Use 2,000 characters or fewer"),
  client: z.string().trim().max(120, "Use 120 characters or fewer"),
  industry: z.string().trim().max(80, "Use 80 characters or fewer"),
  project_type: z.enum(PROJECT_TYPE_VALUES, { error: "Choose a project type" }),
  status: z.enum(EDITABLE_STATUSES, { error: "Choose a status" }),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const projectIdSchema = z.uuid({ error: "Invalid project" });

/** Empty strings from the form are stored as NULL. */
export function toProjectColumns(values: ProjectFormValues) {
  return {
    name: values.name,
    description: values.description || null,
    client: values.client || null,
    industry: values.industry || null,
    project_type: values.project_type,
    status: values.status,
    previous_status: null,
    archived_at: null,
  };
}
