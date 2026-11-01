import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { PUBLIC_PATHS } from "@/config/site";

describe("sitemap and robots", () => {
  it("lists every public marketing page and nothing from the app", () => {
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(urls).toEqual(PUBLIC_PATHS.map((p) => p));
    expect(urls.some((u) => u.startsWith("/dashboard") || u.startsWith("/projects"))).toBe(false);
  });
  it("points crawlers at the sitemap and keeps them out of the app", () => {
    const result = robots();
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.disallow).toEqual(expect.arrayContaining(["/dashboard", "/projects", "/api/"]));
  });
});
