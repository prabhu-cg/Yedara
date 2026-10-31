import { describe, expect, it } from "vitest";
import { projectFormSchema, projectIdSchema, toProjectColumns } from "@/lib/projects/schemas";
import { PROJECT_STATUSES } from "@/lib/projects/constants";

const valid = {
  name: "Checkout research",
  description: "",
  client: "",
  industry: "",
  project_type: "ux_research",
  status: "planning",
} as const;

describe("project form validation", () => {
  it("accepts a minimal project", () => {
    expect(projectFormSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a name and trims it", () => {
    expect(projectFormSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
    expect(projectFormSchema.parse({ ...valid, name: "  Hello  " }).name).toBe("Hello");
  });

  it.each([
    ["name", 121],
    ["description", 2001],
    ["client", 121],
    ["industry", 81],
  ])("limits %s to a maximum length", (field, length) => {
    expect(projectFormSchema.safeParse({ ...valid, [field]: "x".repeat(length) }).success).toBe(false);
    expect(projectFormSchema.safeParse({ ...valid, [field]: "x".repeat(length - 1) }).success).toBe(true);
  });

  it("rejects unknown project types", () => {
    expect(projectFormSchema.safeParse({ ...valid, project_type: "hacking" }).success).toBe(false);
  });

  it("does not allow setting 'archived' through the form", () => {
    expect(projectFormSchema.safeParse({ ...valid, status: "archived" }).success).toBe(false);
  });

  it("accepts every editable status", () => {
    for (const status of PROJECT_STATUSES.filter((s) => s !== "archived")) {
      expect(projectFormSchema.safeParse({ ...valid, status }).success).toBe(true);
    }
  });

  it("strips fields it doesn't know about, including ownership", () => {
    const parsed = projectFormSchema.parse({ ...valid, owner_id: "attacker", id: "x" });
    expect(parsed).not.toHaveProperty("owner_id");
    expect(parsed).not.toHaveProperty("id");
  });
});

describe("toProjectColumns", () => {
  it("stores empty optional fields as null and clears archive state", () => {
    expect(toProjectColumns(projectFormSchema.parse(valid))).toEqual({
      name: "Checkout research",
      description: null,
      client: null,
      industry: null,
      project_type: "ux_research",
      status: "planning",
      previous_status: null,
      archived_at: null,
    });
  });
});

describe("projectIdSchema", () => {
  it("only accepts UUIDs", () => {
    expect(projectIdSchema.safeParse("0f9c1c6e-6b7a-4f0e-9d5f-6a6f1c0f6e11").success).toBe(true);
    expect(projectIdSchema.safeParse("1; drop table projects").success).toBe(false);
    expect(projectIdSchema.safeParse("").success).toBe(false);
  });
});
