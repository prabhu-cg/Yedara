import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/dal", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { parseStatusFilter, sanitizeSearchTerm } from "@/lib/projects/queries";

describe("sanitizeSearchTerm", () => {
  it("removes PostgREST filter syntax so input stays plain text", () => {
    const cleaned = sanitizeSearchTerm("a),status.eq.archived,(name.ilike.%");
    expect(cleaned).not.toMatch(/[,()]/);
    expect(cleaned).not.toContain("%)");
  });

  it("escapes LIKE wildcards", () => {
    expect(sanitizeSearchTerm("100%_done")).toBe("100\\%\\_done");
  });

  it("collapses whitespace, trims and caps length", () => {
    expect(sanitizeSearchTerm("  a   b  ")).toBe("a b");
    expect(sanitizeSearchTerm("x".repeat(500))).toHaveLength(80);
  });

  it("returns an empty string for blank input", () => {
    expect(sanitizeSearchTerm("   ")).toBe("");
  });
});

describe("parseStatusFilter", () => {
  it("accepts known filters and falls back to active", () => {
    expect(parseStatusFilter("review")).toBe("review");
    expect(parseStatusFilter("all")).toBe("all");
    expect(parseStatusFilter("archived")).toBe("archived");
    expect(parseStatusFilter("bogus")).toBe("active");
    expect(parseStatusFilter(undefined)).toBe("active");
  });
});
