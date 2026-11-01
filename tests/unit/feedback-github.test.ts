import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { fileFeedback, isGithubConfigured } from "@/lib/feedback/github";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("github feedback", () => {
  it("is configured only with a token and a repo", () => {
    expect(isGithubConfigured()).toBe(false);
    vi.stubEnv("GITHUB_TOKEN", "t");
    expect(isGithubConfigured()).toBe(false);
    vi.stubEnv("GITHUB_REPO", "o/r");
    expect(isGithubConfigured()).toBe(true);
  });
  it("files an issue with the type's labels and adds it to the project", async () => {
    vi.stubEnv("GITHUB_TOKEN", "t");
    vi.stubEnv("GITHUB_REPO", "o/r");
    vi.stubEnv("GITHUB_PROJECT_OWNER", "o");
    vi.stubEnv("GITHUB_PROJECT_NUMBER", "8");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ node_id: "I_1" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { user: { projectV2: { id: "PVT_1" } } } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: {} })));
    vi.stubGlobal("fetch", fetchMock);
    await fileFeedback("bug", "The board won't load.\nMore detail.");
    const issue = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.github.com/repos/o/r/issues");
    expect(issue.title).toBe("[Feedback] The board won't load.");
    expect(issue.labels).toEqual(["bug", "user-feedback"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("still succeeds when the project add fails", async () => {
    vi.stubEnv("GITHUB_TOKEN", "t");
    vi.stubEnv("GITHUB_REPO", "o/r");
    vi.stubEnv("GITHUB_PROJECT_OWNER", "o");
    vi.stubEnv("GITHUB_PROJECT_NUMBER", "8");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ node_id: "I_1" })))
      .mockResolvedValueOnce(new Response("{}", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fileFeedback("idea", "A reasonable idea here.")).resolves.toBeUndefined();
  });
  it("fails when the issue cannot be created", async () => {
    vi.stubEnv("GITHUB_TOKEN", "t");
    vi.stubEnv("GITHUB_REPO", "o/r");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    await expect(fileFeedback("idea", "A reasonable idea here.")).rejects.toThrow("github 401");
  });
});
