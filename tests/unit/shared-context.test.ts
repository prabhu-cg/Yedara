import { describe, expect, it } from "vitest";
import { countOverrides, resolveSharedContext, withOverride, type ProjectBrief } from "@/lib/shared-context";

const brief: ProjectBrief = {
  description: "Budgeting app",
  industry: "Fintech",
  product_service: "Budgeto",
  target_audience: "Freelancers",
  research_objectives: "Understand invoicing pain",
};

describe("shared project context", () => {
  it("inherits every field from the project when nothing is overridden", () => {
    const ctx = resolveSharedContext(brief, {});
    expect(ctx.industry).toEqual({ value: "Fintech", inherited: "Fintech", overridden: false });
    expect(ctx.target_audience.value).toBe("Freelancers");
    expect(countOverrides({})).toBe(0);
  });

  it("uses an override for this module only and keeps the project value visible", () => {
    const overrides = withOverride({}, "target_audience", "Agencies");
    const ctx = resolveSharedContext(brief, overrides);
    expect(ctx.target_audience).toEqual({ value: "Agencies", inherited: "Freelancers", overridden: true });
    expect(ctx.industry.overridden).toBe(false);
    expect(brief.target_audience).toBe("Freelancers");
  });

  it("treats an empty override as deliberately blank, not as inherit", () => {
    const ctx = resolveSharedContext(brief, withOverride({}, "industry", ""));
    expect(ctx.industry).toMatchObject({ value: "", overridden: true });
  });

  it("resets by removing the key, without mutating the original", () => {
    const original = withOverride({}, "industry", "Health");
    const reset = withOverride(original, "industry", undefined);
    expect(original).toEqual({ industry: "Health" });
    expect(reset).toEqual({});
    expect(countOverrides(original)).toBe(1);
  });

  it("copes with a project that has no brief", () => {
    expect(resolveSharedContext(null, {}).product_service.value).toBe("");
  });
});
