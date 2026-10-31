import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  type Call = { kind: "from" | "rpc"; name: string; ops: [string, unknown[]][] };
  const calls: Call[] = [];
  const results: { data?: unknown; error?: { code: string; message: string } | null; count?: number }[] = [];
  const requireUser = vi.fn();
  const revalidatePath = vi.fn();
  const loadAnalysisBundle = vi.fn();

  function builder(call: Call) {
    const result = results.shift() ?? { data: null, error: null };
    const proxy: unknown = new Proxy(
      {},
      {
        get(_, prop: string) {
          if (prop === "then") return (resolve: (v: unknown) => void) => resolve({ data: null, error: null, ...result });
          return (...args: unknown[]) => {
            call.ops.push([prop, args]);
            return proxy;
          };
        },
      },
    );
    return proxy;
  }
  return { calls, results, requireUser, revalidatePath, loadAnalysisBundle, builder };
});

vi.mock("@/lib/auth/dal", () => ({ requireUser: () => h.requireUser() }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/competitors/queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/competitors/queries")>()),
  loadAnalysisBundle: (...a: unknown[]) => h.loadAnalysisBundle(...a),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from(name: string) {
      const call = { kind: "from" as const, name, ops: [] as [string, unknown[]][] };
      h.calls.push(call);
      return h.builder(call);
    },
    rpc(name: string, args: unknown) {
      const call = { kind: "rpc" as const, name, ops: [["args", [args]]] as [string, unknown[]][] };
      h.calls.push(call);
      return h.builder(call);
    },
  }),
}));

import {
  addCompetitorAction,
  addCriterionAction,
  addSourceAction,
  createAnalysisAction,
  deleteAnalysisAction,
  saveAnalysisContentAction,
  saveCellAction,
  setAnalysisStatusAction,
} from "@/lib/competitors/actions";
import { emptyMarketContext } from "@/lib/competitors/schemas";

const USER = { id: "user-1" };
const ANALYSIS = "0f9c1c6e-6b7a-4f0e-9d5f-6a6f1c0f6e11";
const PROJECT = "7a1c1c6e-6b7a-4f0e-9d5f-6a6f1c0f6e22";
const COMPETITOR = "1b1c1c6e-6b7a-4f0e-9d5f-6a6f1c0f6e33";
const CRITERION = "2c1c1c6e-6b7a-4f0e-9d5f-6a6f1c0f6e44";
const owned = { data: { id: ANALYSIS, project_id: PROJECT } };

const ops = (call: { ops: [string, unknown[]][] }, name: string) => call.ops.filter(([op]) => op === name);
const eqs = (call: { ops: [string, unknown[]][] }) => ops(call, "eq").map(([, a]) => [a[0], a[1]]);

beforeEach(() => {
  h.calls.length = 0;
  h.results.length = 0;
  h.requireUser.mockReset().mockResolvedValue(USER);
  h.revalidatePath.mockReset();
  h.loadAnalysisBundle.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createAnalysisAction", () => {
  it("creates an analysis owned by the signed-in user in one of their projects", async () => {
    h.results.push({ data: { id: PROJECT } }, { data: { id: ANALYSIS } });
    expect(await createAnalysisAction({ title: " Invoicing ", projectId: PROJECT })).toEqual({ ok: true, data: { id: ANALYSIS } });
    expect(eqs(h.calls[0])).toContainEqual(["owner_id", USER.id]);
    const row = ops(h.calls[1], "insert")[0][1][0] as Record<string, unknown>;
    expect(row).toMatchObject({ owner_id: USER.id, project_id: PROJECT, title: "Invoicing" });
  });

  it("ignores an owner supplied by the client", async () => {
    h.results.push({ data: { id: PROJECT } }, { data: { id: ANALYSIS } });
    await createAnalysisAction({ title: "x", projectId: PROJECT, owner_id: "someone-else" });
    expect((ops(h.calls[1], "insert")[0][1][0] as Record<string, unknown>).owner_id).toBe(USER.id);
  });

  it("refuses a project the user doesn't own", async () => {
    h.results.push({ data: null });
    const result = await createAnalysisAction({ title: "x", projectId: PROJECT });
    expect(result).toMatchObject({ ok: false, fieldErrors: { projectId: expect.any(Array) } });
    expect(h.calls).toHaveLength(1);
  });

  it("validates before touching the database", async () => {
    expect(await createAnalysisAction({ title: "", projectId: "x" })).toMatchObject({ ok: false });
    expect(h.calls).toHaveLength(0);
  });
});

describe("ownership checks on child rows", () => {
  it("won't add a competitor to an analysis the user doesn't own", async () => {
    h.results.push({ data: null });
    expect(await addCompetitorAction(ANALYSIS, { name: "Acme", competitor_type: "direct" })).toEqual({ ok: false, error: "Analysis not found." });
    expect(h.calls).toHaveLength(1);
    expect(eqs(h.calls[0])).toEqual([["id", ANALYSIS], ["owner_id", USER.id]]);
  });

  it("won't add a criterion or source to someone else's analysis", async () => {
    h.results.push({ data: null }, { data: null });
    expect(await addCriterionAction(ANALYSIS, { name: "Pricing" })).toMatchObject({ ok: false });
    expect(await addSourceAction(ANALYSIS, COMPETITOR, { url: "https://acme.example" })).toMatchObject({ ok: false });
    expect(h.calls.every((c) => ops(c, "insert").length === 0)).toBe(true);
  });

  it("rejects malformed ids without querying", async () => {
    expect(await addCompetitorAction("nope", { name: "A", competitor_type: "direct" })).toMatchObject({ ok: false });
    expect(await saveCellAction(ANALYSIS, "bad", CRITERION, {})).toMatchObject({ ok: false });
    expect(h.calls).toHaveLength(0);
  });

  it("scopes market and analysis saves to the owner", async () => {
    h.results.push({ data: { id: ANALYSIS, updated_at: "2026-10-31T10:00:00Z" } });
    await saveAnalysisContentAction(ANALYSIS, "market", emptyMarketContext());
    expect(eqs(h.calls[0])).toEqual([["id", ANALYSIS], ["owner_id", USER.id]]);
  });

  it("scopes deletion to the owner", async () => {
    h.results.push({ data: [] });
    expect(await deleteAnalysisAction(ANALYSIS)).toEqual({ ok: false, error: "Analysis not found." });
    expect(eqs(h.calls[0])).toContainEqual(["owner_id", USER.id]);
  });
});

describe("competitor and criteria rows", () => {
  it("stores empty optional fields as null and appends after existing competitors", async () => {
    h.results.push(owned, { count: 2 } as never, { data: { id: COMPETITOR, name: "Acme", competitor_type: "direct", position: 20 } });
    const result = await addCompetitorAction(ANALYSIS, { name: "Acme", competitor_type: "direct", website_url: "" });
    expect(result.ok).toBe(true);
    const row = ops(h.calls[2], "insert")[0][1][0] as Record<string, unknown>;
    expect(row).toMatchObject({ analysis_id: ANALYSIS, website_url: null, description: null, research_date: null, position: 20 });
  });

  it("explains a duplicate criterion instead of failing silently", async () => {
    h.results.push(owned, { count: 1 } as never, { data: null, error: { code: "23505", message: "dup" } });
    expect(await addCriterionAction(ANALYSIS, { name: "Pricing" })).toMatchObject({ ok: false, fieldErrors: { name: ["That criterion is already in the list"] } });
  });
});

describe("source integrity", () => {
  it("always records a typed source as manual, whatever the client sends", async () => {
    h.results.push(owned, { data: { id: "s1", competitor_id: COMPETITOR, url: "https://acme.example", source_type: "website", origin: "manual" } });
    await addSourceAction(ANALYSIS, COMPETITOR, { url: "https://acme.example", origin: "automated" });
    expect(ops(h.calls[1], "insert")[0][1][0]).toMatchObject({ analysis_id: ANALYSIS, competitor_id: COMPETITOR, origin: "manual" });
  });

  it("rejects an unsafe source link", async () => {
    expect(await addSourceAction(ANALYSIS, COMPETITOR, { url: "javascript:alert(1)" })).toMatchObject({ ok: false });
    expect(h.calls).toHaveLength(0);
  });
});

describe("saveCellAction", () => {
  const stored = { competitor_id: COMPETITOR, criterion_id: CRITERION, source_id: null, value: null, status: "unknown", notes: null, origin: "manual" };

  it("upserts one cell per competitor and criterion, as manual", async () => {
    h.results.push(owned, { data: { ...stored, status: "known", value: "$10" } });
    const result = await saveCellAction(ANALYSIS, COMPETITOR, CRITERION, { status: "known", value: "$10" });
    expect(result.ok).toBe(true);
    const [row] = ops(h.calls[1], "upsert")[0][1] as [Record<string, unknown>, { onConflict: string }];
    expect(row).toMatchObject({ analysis_id: ANALYSIS, competitor_id: COMPETITOR, criterion_id: CRITERION, value: "$10", status: "known", origin: "manual" });
    expect((ops(h.calls[1], "upsert")[0][1][1] as { onConflict: string }).onConflict).toBe("competitor_id,criterion_id");
  });

  it("drops stale text when a cell becomes unknown or unavailable", async () => {
    h.results.push(owned, { data: stored });
    await saveCellAction(ANALYSIS, COMPETITOR, CRITERION, { status: "unavailable", value: "left over" });
    expect((ops(h.calls[1], "upsert")[0][1][0] as Record<string, unknown>).value).toBeNull();
  });

  it("reports a source from another competitor as a clear error", async () => {
    h.results.push(owned, { data: null, error: { code: "23503", message: "fk" } });
    expect(await saveCellAction(ANALYSIS, COMPETITOR, CRITERION, { status: "known", value: "x", source_id: "3d1c1c6e-6b7a-4f0e-9d5f-6a6f1c0f6e55" })).toEqual({ ok: false, error: "That source doesn't belong to this competitor." });
  });

  it("doesn't touch the database for someone else's analysis", async () => {
    h.results.push({ data: null });
    expect(await saveCellAction(ANALYSIS, COMPETITOR, CRITERION, {})).toMatchObject({ ok: false });
    expect(h.calls).toHaveLength(1);
  });
});

describe("setAnalysisStatusAction", () => {
  it("re-checks completion on the server", async () => {
    h.results.push(owned);
    h.loadAnalysisBundle.mockResolvedValue({ analysis: { title: "Invoicing", project_id: PROJECT }, competitors: [], criteria: [] });
    const result = await setAnalysisStatusAction(ANALYSIS, "completed");
    expect(result).toMatchObject({ ok: false });
    expect(h.calls).toHaveLength(1);
  });

  it("completes when the required parts are present, even with an empty matrix", async () => {
    h.results.push(owned, { data: null });
    h.loadAnalysisBundle.mockResolvedValue({
      analysis: { title: "Invoicing", project_id: PROJECT },
      competitors: [{ id: "a", name: "Acme" }],
      criteria: [{ id: "k", name: "Pricing" }],
    });
    expect(await setAnalysisStatusAction(ANALYSIS, "completed")).toEqual({ ok: true, data: { status: "completed" } });
    expect(ops(h.calls[1], "update")[0][1][0]).toMatchObject({ status: "completed" });
  });

  it("reopens without re-validating", async () => {
    h.results.push(owned, { data: null });
    expect(await setAnalysisStatusAction(ANALYSIS, "draft")).toEqual({ ok: true, data: { status: "draft" } });
    expect(h.loadAnalysisBundle).not.toHaveBeenCalled();
  });
});
