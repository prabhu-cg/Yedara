import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createDatabase, createUser, type Db } from "./helpers";

let db: Db;
let alice: string;
let bob: string;
let aliceProject: string;
let bobProject: string;
let plan: string;

const project = (user: string, name: string) =>
  asUser(db, user, async () => (await db.query<{ id: string }>(
    `insert into public.projects (name, owner_id) values ($1, $2) returning id`, [name, user])).rows[0].id);

beforeAll(async () => {
  db = await createDatabase();
  alice = await createUser(db, "alice@example.com");
  bob = await createUser(db, "bob@example.com");
  aliceProject = await project(alice, "Alice project");
  bobProject = await project(bob, "Bob project");
  plan = await asUser(db, alice, async () =>
    (await db.query<{ id: string }>(
      `insert into public.research_plans (project_id, title) values ($1, 'Alice plan') returning id`,
      [aliceProject])).rows[0].id);
  await asUser(db, alice, () => db.query(
    `insert into public.research_plan_sections (plan_id, key, position, content) values
       ($1, 'context', 0, '{"product_description":"x"}'), ($1, 'goals', 10, '{}'), ($1, 'methods', 20, '{}')`, [plan]));
});

afterAll(async () => { await db.close(); });

describe("research_plans", () => {
  it("defaults to draft, step 1, owned by the caller", async () => {
    const r = await db.query<{ status: string; current_step: number; owner_id: string }>(
      `select status, current_step, owner_id from public.research_plans where id = $1`, [plan]);
    expect(r.rows[0]).toMatchObject({ status: "draft", current_step: 1, owner_id: alice });
  });

  it("is invisible to other users and anonymous users", async () => {
    expect((await asUser(db, bob, () => db.query(`select 1 from public.research_plans`))).rows).toHaveLength(0);
    await expect(asUser(db, null, () => db.query(`select 1 from public.research_plans`))).rejects.toThrow(/permission denied/i);
  });

  it("cannot be created on someone else's project", async () => {
    await expect(asUser(db, bob, () => db.query(
      `insert into public.research_plans (project_id, title) values ($1, 'Sneaky')`, [aliceProject],
    ))).rejects.toThrow(/row-level security/i);
  });

  it("cannot be created for another owner", async () => {
    await expect(asUser(db, bob, () => db.query(
      `insert into public.research_plans (project_id, title, owner_id) values ($1, 'x', $2)`, [bobProject, alice],
    ))).rejects.toThrow(/row-level security/i);
  });

  it("cannot be moved to a project the user doesn't own", async () => {
    await expect(asUser(db, alice, () => db.query(
      `update public.research_plans set project_id = $1 where id = $2`, [bobProject, plan],
    ))).rejects.toThrow(/row-level security/i);
  });

  it("cannot be updated or deleted by another user", async () => {
    const upd = await asUser(db, bob, () => db.query(`update public.research_plans set title = 'Pwned' where id = $1 returning id`, [plan]));
    const del = await asUser(db, bob, () => db.query(`delete from public.research_plans where id = $1 returning id`, [plan]));
    expect(upd.rows).toHaveLength(0);
    expect(del.rows).toHaveLength(0);
    expect((await db.query<{ title: string }>(`select title from public.research_plans where id = $1`, [plan])).rows[0].title).toBe("Alice plan");
  });

  it("enforces the completed/completed_at invariant and bounded values", async () => {
    await expect(asUser(db, alice, () => db.query(`update public.research_plans set status = 'completed' where id = $1`, [plan])))
      .rejects.toThrow(/research_plans_completed_consistency/);
    await expect(asUser(db, alice, () => db.query(`update public.research_plans set current_step = 9 where id = $1`, [plan])))
      .rejects.toThrow(/check constraint/i);
    await expect(asUser(db, alice, () => db.query(`update public.research_plans set title = '  ' where id = $1`, [plan])))
      .rejects.toThrow(/check constraint/i);
    const ok = await asUser(db, alice, () => db.query(
      `update public.research_plans set status = 'completed', completed_at = now() where id = $1 returning status`, [plan]));
    expect(ok.rows[0]).toMatchObject({ status: "completed" });
    await asUser(db, alice, () => db.query(`update public.research_plans set status = 'draft', completed_at = null where id = $1`, [plan]));
  });
});

describe("research_plan_sections", () => {
  it("are hidden from and immutable to other users", async () => {
    expect((await asUser(db, bob, () => db.query(`select 1 from public.research_plan_sections`))).rows).toHaveLength(0);
    const upd = await asUser(db, bob, () => db.query(
      `update public.research_plan_sections set content = '{"x":1}' where plan_id = $1 returning id`, [plan]));
    const del = await asUser(db, bob, () => db.query(`delete from public.research_plan_sections where plan_id = $1 returning id`, [plan]));
    expect(upd.rows).toHaveLength(0);
    expect(del.rows).toHaveLength(0);
  });

  it("cannot be inserted into another user's plan", async () => {
    await expect(asUser(db, bob, () => db.query(
      `insert into public.research_plan_sections (plan_id, key) values ($1, 'logistics')`, [plan],
    ))).rejects.toThrow(/row-level security/i);
  });

  it("keeps one row per key and validates content", async () => {
    await expect(asUser(db, alice, () => db.query(
      `insert into public.research_plan_sections (plan_id, key) values ($1, 'context')`, [plan],
    ))).rejects.toThrow(/research_plan_sections_unique_key/);
    await expect(asUser(db, alice, () => db.query(
      `insert into public.research_plan_sections (plan_id, key, content) values ($1, 'x_bad', '[1]')`, [plan],
    ))).rejects.toThrow(/check constraint/i);
    await expect(asUser(db, alice, () => db.query(
      `insert into public.research_plan_sections (plan_id, key) values ($1, 'Bad Key!')`, [plan],
    ))).rejects.toThrow(/check constraint/i);
  });

  it("bumps the plan's updated_at when a section is edited", async () => {
    const before = (await db.query<{ updated_at: string }>(`select updated_at from public.research_plans where id = $1`, [plan])).rows[0].updated_at;
    await new Promise((r) => setTimeout(r, 15));
    await asUser(db, alice, () => db.query(
      `update public.research_plan_sections set content = '{"primary_goal":"g"}' where plan_id = $1 and key = 'goals'`, [plan]));
    const after = (await db.query<{ updated_at: string }>(`select updated_at from public.research_plans where id = $1`, [plan])).rows[0].updated_at;
    expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  it("preserves ordering via the reorder RPC", async () => {
    await asUser(db, alice, () => db.query(
      `select public.reorder_research_plan_sections($1, array['methods','context','goals'])`, [plan]));
    const rows = await db.query<{ key: string }>(
      `select key from public.research_plan_sections where plan_id = $1 order by position`, [plan]);
    expect(rows.rows.map((r) => r.key)).toEqual(["methods", "context", "goals"]);
  });

  it("reorder RPC cannot touch another user's plan", async () => {
    await asUser(db, bob, () => db.query(
      `select public.reorder_research_plan_sections($1, array['goals','methods','context'])`, [plan]));
    const rows = await db.query<{ key: string }>(
      `select key from public.research_plan_sections where plan_id = $1 order by position`, [plan]);
    expect(rows.rows.map((r) => r.key)).toEqual(["methods", "context", "goals"]);
  });
});

describe("duplicate_research_plan", () => {
  it("copies the plan and sections into a new draft owned by the caller", async () => {
    const id = await asUser(db, alice, async () =>
      (await db.query<{ d: string }>(`select public.duplicate_research_plan($1) as d`, [plan])).rows[0].d);
    expect(id).not.toBe(plan);
    const copy = (await db.query<{ title: string; status: string; owner_id: string }>(
      `select title, status, owner_id from public.research_plans where id = $1`, [id])).rows[0];
    expect(copy).toMatchObject({ title: "Alice plan (copy)", status: "draft", owner_id: alice });
    const sections = await db.query<{ key: string; content: unknown }>(
      `select key, content from public.research_plan_sections where plan_id = $1 order by position`, [id]);
    expect(sections.rows.map((r) => r.key)).toEqual(["methods", "context", "goals"]);
    expect(sections.rows.find((r) => r.key === "context")?.content).toEqual({ product_description: "x" });
  });

  it("refuses to duplicate a plan the caller can't see", async () => {
    await expect(asUser(db, bob, () => db.query(`select public.duplicate_research_plan($1)`, [plan])))
      .rejects.toThrow(/not found/i);
    const count = await db.query<{ n: number }>(`select count(*)::int as n from public.research_plans where owner_id = $1`, [bob]);
    expect(count.rows[0].n).toBe(0);
  });

  it("is not callable by anonymous users", async () => {
    await expect(asUser(db, null, () => db.query(`select public.duplicate_research_plan($1)`, [plan])))
      .rejects.toThrow(/permission denied/i);
  });
});

describe("cascades", () => {
  it("deleting a project removes its plans and their sections", async () => {
    const p = await project(alice, "Disposable");
    const planId = await asUser(db, alice, async () => (await db.query<{ id: string }>(
      `insert into public.research_plans (project_id, title) values ($1, 'Tmp') returning id`, [p])).rows[0].id);
    await asUser(db, alice, () => db.query(`insert into public.research_plan_sections (plan_id, key) values ($1, 'context')`, [planId]));
    await asUser(db, alice, () => db.query(`delete from public.projects where id = $1`, [p]));
    expect((await db.query(`select 1 from public.research_plans where id = $1`, [planId])).rows).toHaveLength(0);
    expect((await db.query(`select 1 from public.research_plan_sections where plan_id = $1`, [planId])).rows).toHaveLength(0);
  });
});
