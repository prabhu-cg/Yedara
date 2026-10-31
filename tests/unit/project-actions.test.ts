import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  type Call = { table: string; ops: [string, unknown[]][] };
  const calls: Call[] = [];
  const results: { data?: unknown; error?: { code: string; message: string } | null }[] = [];
  const requireUser = vi.fn();
  const revalidatePath = vi.fn();

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

  return { calls, results, requireUser, revalidatePath, builder };
});

vi.mock("@/lib/auth/dal", () => ({ requireUser: () => h.requireUser() }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from(table: string) {
      const call = { table, ops: [] as [string, unknown[]][] };
      h.calls.push(call);
      return h.builder(call);
    },
  }),
}));

import {
  archiveProjectAction,
  createProjectAction,
  deleteProjectAction,
  restoreProjectAction,
  updateProjectAction,
} from "@/lib/projects/actions";

const USER = { id: "user-1111-1111-1111-111111111111" };
const PROJECT_ID = "0f9c1c6e-6b7a-4f0e-9d5f-6a6f1c0f6e11";
const valid = {
  name: "Research",
  description: "",
  client: "",
  industry: "",
  product_service: "",
  target_audience: "",
  research_objectives: "",
  project_type: "ux_research",
  status: "planning",
};

const ops = (call: { ops: [string, unknown[]][] }, name: string) => call.ops.filter(([op]) => op === name);
const ownerScoped = (call: { ops: [string, unknown[]][] }) =>
  ops(call, "eq").some(([, args]) => args[0] === "owner_id" && args[1] === USER.id);

beforeEach(() => {
  h.calls.length = 0;
  h.results.length = 0;
  h.requireUser.mockReset().mockResolvedValue(USER);
  h.revalidatePath.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createProjectAction", () => {
  it("creates a project owned by the signed-in user", async () => {
    h.results.push({ data: { id: PROJECT_ID } });
    const result = await createProjectAction(valid);
    expect(result).toEqual({ ok: true, data: { id: PROJECT_ID } });

    const insert = ops(h.calls[0], "insert")[0][1][0] as Record<string, unknown>;
    expect(insert.owner_id).toBe(USER.id);
    expect(insert.name).toBe("Research");
    expect(insert.description).toBeNull();
    expect(h.revalidatePath).toHaveBeenCalledWith("/projects");
  });

  it("ignores an owner_id supplied by the client", async () => {
    h.results.push({ data: { id: PROJECT_ID } });
    await createProjectAction({ ...valid, owner_id: "someone-else" });
    const insert = ops(h.calls[0], "insert")[0][1][0] as Record<string, unknown>;
    expect(insert.owner_id).toBe(USER.id);
  });

  it("returns field errors and never touches the database for invalid input", async () => {
    const result = await createProjectAction({ ...valid, name: "" });
    expect(result).toMatchObject({ ok: false, fieldErrors: { name: expect.any(Array) } });
    expect(h.calls).toHaveLength(0);
  });

  it("requires a session", async () => {
    h.requireUser.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(createProjectAction(valid)).rejects.toThrow("NEXT_REDIRECT");
    expect(h.calls).toHaveLength(0);
  });

  it("returns a safe message and hides database details on failure", async () => {
    h.results.push({ data: null, error: { code: "23505", message: 'duplicate key value violates "projects_pkey"' } });
    const result = await createProjectAction(valid);
    expect(result).toEqual({ ok: false, error: "We couldn't create the project. Please try again." });
    expect(JSON.stringify(result)).not.toContain("projects_pkey");
  });
});

describe("updateProjectAction", () => {
  it("scopes the lookup and the update to the owner", async () => {
    h.results.push({ data: { status: "planning" } }, { data: { id: PROJECT_ID } });
    const result = await updateProjectAction(PROJECT_ID, { ...valid, name: "Renamed", status: "review" });
    expect(result).toEqual({ ok: true, data: { id: PROJECT_ID } });
    expect(h.calls.every(ownerScoped)).toBe(true);
    const update = ops(h.calls[1], "update")[0][1][0] as Record<string, unknown>;
    expect(update).toMatchObject({ name: "Renamed", status: "review" });
    expect(update).not.toHaveProperty("owner_id");
  });

  it("reports not found (without updating) when the project isn't the user's", async () => {
    h.results.push({ data: null });
    const result = await updateProjectAction(PROJECT_ID, valid);
    expect(result).toEqual({ ok: false, error: "Project not found." });
    expect(h.calls).toHaveLength(1);
    expect(ops(h.calls[0], "update")).toHaveLength(0);
  });

  it("does not un-archive a project when it is edited", async () => {
    h.results.push({ data: { status: "archived" } }, { data: { id: PROJECT_ID } });
    await updateProjectAction(PROJECT_ID, { ...valid, status: "completed" });
    const update = ops(h.calls[1], "update")[0][1][0] as Record<string, unknown>;
    expect(update).not.toHaveProperty("status");
  });

  it("rejects malformed project ids before querying", async () => {
    const result = await updateProjectAction("not-a-uuid", valid);
    expect(result).toEqual({ ok: false, error: "Project not found." });
    expect(h.calls).toHaveLength(0);
  });

  it("validates the payload", async () => {
    const result = await updateProjectAction(PROJECT_ID, { ...valid, name: "x".repeat(200) });
    expect(result.ok).toBe(false);
    expect(h.calls).toHaveLength(0);
  });
});

describe("archive and restore", () => {
  it("remembers the previous status when archiving", async () => {
    h.results.push({ data: { status: "review" } }, { data: null });
    expect(await archiveProjectAction(PROJECT_ID)).toEqual({ ok: true });
    const update = ops(h.calls[1], "update")[0][1][0] as Record<string, unknown>;
    expect(update).toMatchObject({ status: "archived", previous_status: "review" });
    expect(update.archived_at).toEqual(expect.any(String));
    expect(h.calls.every(ownerScoped)).toBe(true);
  });

  it("is idempotent for already archived projects", async () => {
    h.results.push({ data: { status: "archived" } });
    expect(await archiveProjectAction(PROJECT_ID)).toEqual({ ok: true });
    expect(h.calls).toHaveLength(1);
  });

  it("restores the previous status", async () => {
    h.results.push({ data: { status: "archived", previous_status: "completed" } }, { data: null });
    expect(await restoreProjectAction(PROJECT_ID)).toEqual({ ok: true });
    const update = ops(h.calls[1], "update")[0][1][0] as Record<string, unknown>;
    expect(update).toEqual({ status: "completed", previous_status: null, archived_at: null });
  });

  it("falls back to planning when no previous status is known", async () => {
    h.results.push({ data: { status: "archived", previous_status: null } }, { data: null });
    await restoreProjectAction(PROJECT_ID);
    const update = ops(h.calls[1], "update")[0][1][0] as Record<string, unknown>;
    expect(update.status).toBe("planning");
  });

  it("reports not found for projects the user doesn't own", async () => {
    h.results.push({ data: null });
    expect(await archiveProjectAction(PROJECT_ID)).toEqual({ ok: false, error: "Project not found." });
    h.results.push({ data: null });
    expect(await restoreProjectAction(PROJECT_ID)).toEqual({ ok: false, error: "Project not found." });
  });
});

describe("deleteProjectAction", () => {
  it("deletes only the owner's project", async () => {
    h.results.push({ data: [{ id: PROJECT_ID }] });
    expect(await deleteProjectAction(PROJECT_ID)).toEqual({ ok: true });
    const call = h.calls[0];
    expect(ops(call, "delete")).toHaveLength(1);
    expect(ops(call, "eq").map(([, args]) => args)).toEqual(
      expect.arrayContaining([["id", PROJECT_ID], ["owner_id", USER.id]]),
    );
    expect(h.revalidatePath).toHaveBeenCalledWith("/projects");
  });

  it("returns not found when nothing was deleted (someone else's or missing project)", async () => {
    h.results.push({ data: [] });
    expect(await deleteProjectAction(PROJECT_ID)).toEqual({ ok: false, error: "Project not found." });
  });

  it("rejects malformed ids without querying", async () => {
    expect(await deleteProjectAction("../../etc/passwd")).toEqual({ ok: false, error: "Project not found." });
    expect(h.calls).toHaveLength(0);
  });

  it("requires a session", async () => {
    h.requireUser.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(deleteProjectAction(PROJECT_ID)).rejects.toThrow("NEXT_REDIRECT");
    expect(h.calls).toHaveLength(0);
  });

  it("hides database details when the delete fails", async () => {
    h.results.push({ data: null, error: { code: "XX000", message: "secret internal detail" } });
    const result = await deleteProjectAction(PROJECT_ID);
    expect(result).toEqual({ ok: false, error: "We couldn't delete the project. Please try again." });
  });
});
