import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  type Call = { kind: "from" | "rpc"; name: string; ops: [string, unknown[]][] };
  const calls: Call[] = [];
  const results: { data?: unknown; error?: { code: string; message: string } | null }[] = [];
  const requireUser = vi.fn();
  const revalidatePath = vi.fn();
  const loadPlanBundle = vi.fn();

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
  return { calls, results, requireUser, revalidatePath, loadPlanBundle, builder };
});

vi.mock("@/lib/auth/dal", () => ({ requireUser: () => h.requireUser() }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/research-planner/queries", () => ({ loadPlanBundle: (...a: unknown[]) => h.loadPlanBundle(...a) }));
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
  createPlanAction,
  deletePlanAction,
  duplicatePlanAction,
  generateMaterialsAction,
  reorderSectionsAction,
  savePlanSectionAction,
  setPlanStatusAction,
  updatePlanMetaAction,
} from "@/lib/research-planner/actions";
import { DEFAULT_POSITIONS } from "@/lib/research-planner/constants";
import { emptyContent } from "@/lib/research-planner/schemas";

const USER = { id: "user-1" };
const PLAN = "0f9c1c6e-6b7a-4f0e-9d5f-6a6f1c0f6e11";
const PROJECT = "7a1c1c6e-6b7a-4f0e-9d5f-6a6f1c0f6e22";
const owned = { data: { id: PLAN, project_id: PROJECT, status: "draft" } };

const ops = (call: { ops: [string, unknown[]][] }, name: string) => call.ops.filter(([op]) => op === name);
const eqs = (call: { ops: [string, unknown[]][] }) => ops(call, "eq").map(([, a]) => [a[0], a[1]]);

beforeEach(() => {
  h.calls.length = 0;
  h.results.length = 0;
  h.requireUser.mockReset().mockResolvedValue(USER);
  h.revalidatePath.mockReset();
  h.loadPlanBundle.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createPlanAction", () => {
  it("creates a plan owned by the signed-in user, with its core sections", async () => {
    h.results.push({ data: { id: PROJECT } }, { data: { id: PLAN } }, { data: null });
    const result = await createPlanAction({ title: "  My plan ", projectId: PROJECT });
    expect(result).toEqual({ ok: true, data: { id: PLAN } });

    const plan = ops(h.calls[1], "insert")[0][1][0] as Record<string, unknown>;
    expect(plan).toEqual({ owner_id: USER.id, project_id: PROJECT, title: "My plan" });

    const sections = ops(h.calls[2], "insert")[0][1][0] as { key: string; position: number; plan_id: string; content: unknown }[];
    expect(sections.map((s) => s.key)).toEqual(["context", "goals", "methods", "participants", "logistics"]);
    expect(sections.every((s) => s.plan_id === PLAN)).toBe(true);
    expect(sections.find((s) => s.key === "logistics")!.position).toBe(DEFAULT_POSITIONS.logistics);
    expect(sections.find((s) => s.key === "goals")!.content).toEqual(emptyContent("goals"));
  });

  it("verifies the project belongs to the user and ignores a client-supplied owner", async () => {
    h.results.push({ data: null });
    const result = await createPlanAction({ title: "Plan", projectId: PROJECT, owner_id: "someone-else" });
    expect(result).toMatchObject({ ok: false, error: "Choose one of your projects." });
    expect(eqs(h.calls[0])).toEqual(expect.arrayContaining([["owner_id", USER.id]]));
    expect(h.calls).toHaveLength(1);
  });

  it("validates input before touching the database", async () => {
    expect(await createPlanAction({ title: "", projectId: PROJECT })).toMatchObject({ ok: false, fieldErrors: { title: expect.any(Array) } });
    expect(await createPlanAction({ title: "x".repeat(161), projectId: PROJECT })).toMatchObject({ ok: false });
    expect(await createPlanAction({ title: "ok", projectId: "nope" })).toMatchObject({ ok: false, fieldErrors: { projectId: expect.any(Array) } });
    expect(h.calls).toHaveLength(0);
  });

  it("requires a session", async () => {
    h.requireUser.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(createPlanAction({ title: "a", projectId: PROJECT })).rejects.toThrow("NEXT_REDIRECT");
    expect(h.calls).toHaveLength(0);
  });

  it("removes the plan again if its sections cannot be created", async () => {
    h.results.push({ data: { id: PROJECT } }, { data: { id: PLAN } }, { error: { code: "XX", message: "secret db detail" } });
    const result = await createPlanAction({ title: "Plan", projectId: PROJECT });
    expect(result).toEqual({ ok: false, error: "We couldn't create the plan. Please try again." });
    const cleanup = h.calls[3];
    expect(cleanup.name).toBe("research_plans");
    expect(ops(cleanup, "delete")).toHaveLength(1);
    expect(eqs(cleanup)).toEqual(expect.arrayContaining([["id", PLAN], ["owner_id", USER.id]]));
  });
});

describe("savePlanSectionAction", () => {
  const content = { product_description: "Hello" };

  it("saves validated content to the owner's section", async () => {
    h.results.push(owned, { data: [{ id: "s1", updated_at: "2026-01-01T00:00:00Z" }] });
    const result = await savePlanSectionAction(PLAN, "context", content);
    expect(result).toMatchObject({ ok: true, data: { savedAt: "2026-01-01T00:00:00Z" } });
    expect(eqs(h.calls[0])).toEqual(expect.arrayContaining([["id", PLAN], ["owner_id", USER.id]]));
    expect(eqs(h.calls[1])).toEqual([["plan_id", PLAN], ["key", "context"]]);
    const saved = (ops(h.calls[1], "update")[0][1][0] as { content: Record<string, unknown> }).content;
    expect(saved.product_description).toBe("Hello");
    expect(saved.industry).toBe("");
  });

  it("normalises content on the server (e.g. de-duplicates methods)", async () => {
    h.results.push(owned, { data: [{ id: "s", updated_at: "t" }] });
    await savePlanSectionAction(PLAN, "methods", { selected: ["surveys", "surveys"] });
    const saved = (ops(h.calls[1], "update")[0][1][0] as { content: { selected: string[] } }).content;
    expect(saved.selected).toEqual(["surveys"]);
  });

  it("rejects unknown sections, invalid ids and oversized or malformed content without querying", async () => {
    expect(await savePlanSectionAction(PLAN, "../secrets", content)).toMatchObject({ ok: false, error: "Research plan not found." });
    expect(await savePlanSectionAction("nope", "context", content)).toMatchObject({ ok: false });
    expect(await savePlanSectionAction(PLAN, "context", { product_description: "x".repeat(6000) })).toMatchObject({ ok: false });
    expect(await savePlanSectionAction(PLAN, "methods", { selected: ["telepathy"] })).toMatchObject({ ok: false });
    expect(await savePlanSectionAction(PLAN, "participants", { count: "many" })).toMatchObject({ ok: false });
    expect(h.calls).toHaveLength(0);
  });

  it("refuses plans the user does not own", async () => {
    h.results.push({ data: null });
    expect(await savePlanSectionAction(PLAN, "context", content)).toEqual({ ok: false, error: "Research plan not found." });
    expect(h.calls).toHaveLength(1);
    expect(ops(h.calls[0], "update")).toHaveLength(0);
  });

  it("only creates missing core sections, never materials, on demand", async () => {
    h.results.push(owned, { data: [] });
    expect(await savePlanSectionAction(PLAN, "survey_questions", { questions: [] })).toEqual({ ok: false, error: "Section not found." });
    expect(h.calls).toHaveLength(2);

    h.calls.length = 0;
    h.results.push(owned, { data: [] }, { data: { updated_at: "t2" } });
    expect(await savePlanSectionAction(PLAN, "logistics", {})).toMatchObject({ ok: true, data: { savedAt: "t2" } });
    const inserted = ops(h.calls[2], "insert")[0][1][0] as { key: string; position: number };
    expect(inserted).toMatchObject({ plan_id: PLAN, key: "logistics", position: DEFAULT_POSITIONS.logistics });
  });

  it("hides database details on failure", async () => {
    h.results.push(owned, { error: { code: "XX", message: "relation research_plan_sections is broken" } });
    const result = await savePlanSectionAction(PLAN, "context", content);
    expect(result).toEqual({ ok: false, error: "We couldn't save your changes." });
  });
});

describe("updatePlanMetaAction", () => {
  it("updates the title and step for the owner", async () => {
    h.results.push(owned, { data: { id: PLAN, updated_at: "t" } });
    const result = await updatePlanMetaAction(PLAN, { title: " New title ", currentStep: 3 });
    expect(result).toMatchObject({ ok: true });
    expect(ops(h.calls[1], "update")[0][1][0]).toEqual({ title: "New title", current_step: 3 });
    expect(eqs(h.calls[1])).toEqual(expect.arrayContaining([["owner_id", USER.id]]));
  });

  it("only allows moving a plan to a project the user owns", async () => {
    h.results.push(owned, { data: null });
    const result = await updatePlanMetaAction(PLAN, { projectId: "9a1c1c6e-6b7a-4f0e-9d5f-6a6f1c0f6e99" });
    expect(result).toMatchObject({ ok: false, error: "Choose one of your projects." });
    expect(h.calls.some((c) => c.name === "research_plans" && ops(c, "update").length)).toBe(false);
    expect(eqs(h.calls[1])).toEqual(expect.arrayContaining([["owner_id", USER.id]]));
  });

  it("rejects invalid titles and steps", async () => {
    expect(await updatePlanMetaAction(PLAN, { title: "" })).toMatchObject({ ok: false });
    expect(await updatePlanMetaAction(PLAN, { currentStep: 9 })).toMatchObject({ ok: false });
    expect(await updatePlanMetaAction(PLAN, { currentStep: 1.5 })).toMatchObject({ ok: false });
    expect(h.calls).toHaveLength(0);
  });

  it("is a no-op when nothing changed", async () => {
    h.results.push(owned);
    expect(await updatePlanMetaAction(PLAN, {})).toMatchObject({ ok: true });
    expect(h.calls).toHaveLength(1);
  });
});

describe("setPlanStatusAction", () => {
  const bundle = (over: Record<string, unknown> = {}) => ({
    plan: { title: "Plan", project_id: PROJECT },
    sections: {
      context: { content: { product_description: "x" } },
      goals: { content: { primary_goal: "g", research_questions: ["q"] } },
      methods: { content: { selected: ["desk_research"] } },
      ...over,
    },
  });

  it("re-validates on the server and lists what is missing", async () => {
    h.results.push(owned);
    h.loadPlanBundle.mockResolvedValue(bundle({ goals: { content: {} } }));
    const result = await setPlanStatusAction(PLAN, "completed");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/state your primary research goal/);
      expect(result.error).toMatch(/at least one key research question/);
    }
    expect(h.calls.filter((c) => ops(c, "update").length)).toHaveLength(0);
  });

  it("completes a valid plan and stamps completed_at", async () => {
    h.results.push(owned, { data: null });
    h.loadPlanBundle.mockResolvedValue(bundle());
    expect(await setPlanStatusAction(PLAN, "completed")).toEqual({ ok: true, data: { status: "completed" } });
    const update = ops(h.calls[1], "update")[0][1][0] as { status: string; completed_at: string };
    expect(update.status).toBe("completed");
    expect(update.completed_at).toEqual(expect.any(String));
  });

  it("reopens a plan as a draft without re-validating", async () => {
    h.results.push(owned, { data: null });
    expect(await setPlanStatusAction(PLAN, "draft")).toEqual({ ok: true, data: { status: "draft" } });
    expect(ops(h.calls[1], "update")[0][1][0]).toEqual({ status: "draft", completed_at: null });
    expect(h.loadPlanBundle).not.toHaveBeenCalled();
  });

  it("rejects unknown statuses and plans the user does not own", async () => {
    expect(await setPlanStatusAction(PLAN, "published")).toMatchObject({ ok: false });
    h.results.push({ data: null });
    expect(await setPlanStatusAction(PLAN, "draft")).toMatchObject({ ok: false, error: "Research plan not found." });
  });
});

describe("generateMaterialsAction", () => {
  const bundle = (sections: Record<string, unknown> = {}) => ({
    plan: { title: "Plan" },
    project: { name: "Budgeto" },
    sections: {
      methods: { content: { selected: ["user_interviews"] }, position: 20, source: "manual" },
      goals: { content: { user_questions: ["How do users decide?"] }, position: 10, source: "manual" },
      ...sections,
    },
  });

  it("creates only the materials relevant to the selected methods", async () => {
    h.results.push(owned, { data: null }, { data: null });
    h.loadPlanBundle.mockResolvedValue(bundle());
    const result = await generateMaterialsAction(PLAN, {});
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.sections.map((s) => s.key)).toEqual(["interview_guide", "interview_questions"]);
    const inserted = h.calls.slice(1).map((c) => (ops(c, "insert")[0][1][0] as { key: string; source: string; plan_id: string }));
    expect(inserted.map((i) => i.key)).toEqual(["interview_guide", "interview_questions"]);
    expect(inserted.every((i) => i.source === "template" && i.plan_id === PLAN)).toBe(true);
  });

  it("ignores requested materials that do not apply to the plan's methods", async () => {
    h.results.push(owned);
    h.loadPlanBundle.mockResolvedValue(bundle());
    const result = await generateMaterialsAction(PLAN, { keys: ["survey_questions"] });
    expect(result).toMatchObject({ ok: false });
    expect(h.calls).toHaveLength(1);
  });

  it("never overwrites existing content unless asked", async () => {
    h.results.push(owned);
    h.loadPlanBundle.mockResolvedValue(
      bundle({
        interview_guide: { content: {}, position: 40, source: "manual" },
        interview_questions: { content: {}, position: 50, source: "manual" },
      }),
    );
    const result = await generateMaterialsAction(PLAN, {});
    expect(result).toEqual({ ok: true, data: { sections: [] } });
    expect(h.calls).toHaveLength(1);

    h.calls.length = 0;
    h.results.push(owned, { data: null });
    h.loadPlanBundle.mockResolvedValue(bundle({ interview_guide: { content: {}, position: 40, source: "manual" } }));
    const overwrite = await generateMaterialsAction(PLAN, { keys: ["interview_guide"], overwrite: true });
    expect(overwrite.ok).toBe(true);
    expect(ops(h.calls[1], "update")).toHaveLength(1);
    expect(eqs(h.calls[1])).toEqual([["plan_id", PLAN], ["key", "interview_guide"]]);
  });

  it("can start a blank section marked as manual", async () => {
    h.results.push(owned, { data: null });
    h.loadPlanBundle.mockResolvedValue(bundle());
    await generateMaterialsAction(PLAN, { keys: ["interview_guide"], blank: true });
    const row = ops(h.calls[1], "insert")[0][1][0] as { source: string; content: unknown };
    expect(row.source).toBe("manual");
    expect(row.content).toEqual(emptyContent("interview_guide"));
  });

  it("rejects malformed requests", async () => {
    expect(await generateMaterialsAction(PLAN, { keys: ["context"] })).toMatchObject({ ok: false });
    expect(await generateMaterialsAction("bad", {})).toMatchObject({ ok: false });
    expect(h.calls).toHaveLength(0);
  });
});

describe("reorderSectionsAction", () => {
  it("passes a validated order to the database", async () => {
    h.results.push(owned, { data: null });
    expect(await reorderSectionsAction(PLAN, ["goals", "context", "methods"])).toEqual({ ok: true });
    expect(h.calls[1]).toMatchObject({ kind: "rpc", name: "reorder_research_plan_sections" });
    expect(ops(h.calls[1], "args")[0][1][0]).toEqual({ p_plan_id: PLAN, p_keys: ["goals", "context", "methods"] });
  });

  it("rejects duplicates, unknown keys and empty lists", async () => {
    expect(await reorderSectionsAction(PLAN, ["goals", "goals"])).toMatchObject({ ok: false });
    expect(await reorderSectionsAction(PLAN, ["goals", "drop_table"])).toMatchObject({ ok: false });
    expect(await reorderSectionsAction(PLAN, [])).toMatchObject({ ok: false });
    expect(await reorderSectionsAction(PLAN, "goals")).toMatchObject({ ok: false });
    expect(h.calls).toHaveLength(0);
  });

  it("refuses plans the user does not own", async () => {
    h.results.push({ data: null });
    expect(await reorderSectionsAction(PLAN, ["goals"])).toMatchObject({ ok: false, error: "Research plan not found." });
    expect(h.calls.some((c) => c.kind === "rpc")).toBe(false);
  });
});

describe("duplicatePlanAction and deletePlanAction", () => {
  it("duplicates through the RPC after confirming ownership", async () => {
    h.results.push(owned, { data: "new-plan-id" });
    expect(await duplicatePlanAction(PLAN)).toEqual({ ok: true, data: { id: "new-plan-id" } });
    expect(h.calls[1]).toMatchObject({ kind: "rpc", name: "duplicate_research_plan" });
  });

  it("does not duplicate plans the user does not own, and hides errors", async () => {
    h.results.push({ data: null });
    expect(await duplicatePlanAction(PLAN)).toMatchObject({ ok: false, error: "Research plan not found." });
    h.calls.length = 0;
    h.results.push(owned, { error: { code: "P0002", message: "Research plan not found at row 12" } });
    expect(await duplicatePlanAction(PLAN)).toEqual({ ok: false, error: "We couldn't duplicate the plan. Please try again." });
  });

  it("deletes only the owner's plan", async () => {
    h.results.push({ data: [{ id: PLAN, project_id: PROJECT }] });
    expect(await deletePlanAction(PLAN)).toEqual({ ok: true });
    expect(eqs(h.calls[0])).toEqual(expect.arrayContaining([["id", PLAN], ["owner_id", USER.id]]));
    expect(h.revalidatePath).toHaveBeenCalledWith("/tools/research-planner");
  });

  it("reports not found when nothing was deleted", async () => {
    h.results.push({ data: [] });
    expect(await deletePlanAction(PLAN)).toEqual({ ok: false, error: "Research plan not found." });
    expect(await deletePlanAction("../..")).toEqual({ ok: false, error: "Research plan not found." });
  });
});
