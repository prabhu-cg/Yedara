import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "@/lib/env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "a-long-enough-anon-key-value",
};

describe("environment validation", () => {
  it("accepts a valid configuration", () => {
    expect(parsePublicEnv(valid).NEXT_PUBLIC_SUPABASE_URL).toBe("https://abc.supabase.co");
  });

  it("treats an empty optional site URL as unset", () => {
    expect(parsePublicEnv({ ...valid, NEXT_PUBLIC_SITE_URL: "" }).NEXT_PUBLIC_SITE_URL).toBeUndefined();
  });

  it("fails with a helpful message when variables are missing", () => {
    expect(() => parsePublicEnv({})).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => parsePublicEnv({})).toThrow(/\.env\.example/);
  });

  it("rejects malformed URLs", () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not a url" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("never echoes secret values in the error", () => {
    try {
      parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: "short" });
    } catch (error) {
      expect(String(error)).not.toContain("short\n");
      expect(String(error)).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
  });
});
