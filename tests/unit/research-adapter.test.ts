import { afterEach, describe, expect, it } from "vitest";
import { disabledResearchAdapter, getResearchAdapter, isAllowedByRobots, setResearchAdapter, validateResearchUrl } from "@/lib/competitors/research-adapter";

afterEach(() => setResearchAdapter(disabledResearchAdapter));

describe("research adapter", () => {
  it("is disabled by default, so manual research needs no external service", async () => {
    expect(getResearchAdapter().enabled).toBe(false);
    expect(await getResearchAdapter().research({ url: "https://example.com", topic: "pricing" })).toMatchObject({ ok: false, reason: "disabled" });
  });
});

describe("validateResearchUrl", () => {
  it.each(["https://example.com/pricing", "http://example.com", "https://sub.example.co.uk/a?b=1"])("allows %s", (url) => {
    expect(validateResearchUrl(url).ok).toBe(true);
  });

  it.each([
    "file:///etc/passwd",
    "ftp://example.com",
    "javascript:alert(1)",
    "not a url",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://10.0.0.5/admin",
    "http://192.168.1.1",
    "http://172.20.0.1",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/",
    "http://printer.local",
    "http://intranet",
    "https://user:pass@example.com",
    "https://example.com:8443",
  ])("rejects %s", (url) => {
    expect(validateResearchUrl(url).ok).toBe(false);
  });
});

describe("isAllowedByRobots", () => {
  const robots = `
User-agent: *
Disallow: /private/
Allow: /private/public.html
Disallow: /*.pdf$

User-agent: YedaraBot
Disallow: /
`;

  it("respects the most specific matching group", () => {
    expect(isAllowedByRobots(robots, "YedaraBot/1.0", "/pricing")).toBe(false);
    expect(isAllowedByRobots(robots, "OtherBot", "/pricing")).toBe(true);
  });

  it("applies Disallow and the longer Allow override", () => {
    expect(isAllowedByRobots(robots, "OtherBot", "/private/secret")).toBe(false);
    expect(isAllowedByRobots(robots, "OtherBot", "/private/public.html")).toBe(true);
  });

  it("supports wildcards and end anchors", () => {
    expect(isAllowedByRobots(robots, "OtherBot", "/files/report.pdf")).toBe(false);
    expect(isAllowedByRobots(robots, "OtherBot", "/files/report.pdf.html")).toBe(true);
  });

  it("allows everything when there is no robots.txt content or no matching rules", () => {
    expect(isAllowedByRobots("", "Bot", "/anything")).toBe(true);
    expect(isAllowedByRobots("User-agent: Other\nDisallow: /", "Bot", "/x")).toBe(true);
  });

  it("treats an empty Disallow as allow-all", () => {
    expect(isAllowedByRobots("User-agent: *\nDisallow:", "Bot", "/x")).toBe(true);
  });
});
