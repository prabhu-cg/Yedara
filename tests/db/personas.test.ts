import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createDatabase, createUser, type Db } from "./helpers";

let db: Db;
let alice: string;
let bob: string;
let aliceProject: string;
let bobProject: string;
let persona: string;

const project = (user: string, name: string) =>
  asUser(db, user, async () => (await db.query<{ id: string }>(
    `insert into public.projects (name, owner_id) values ($1, $2) returning id`, [name, user])).rows[0].id);

beforeAll(async () => {
  db = await createDatabase();
  alice = await createUser(db, "alice@example.com");
  bob = await createUser(db, "bob@example.com");
  aliceProject = await project(alice, "Alice project");
  bobProject = await project(bob, "Bob project");
  persona = await asUser(db, alice, async () => (await db.query<{ id: string }>(
    `insert into public.personas (project_id, name) values ($1, 'Maya') returning id`, [aliceProject])).rows[0].id);
  await asUser(db, alice, () => db.query(
    `insert into public.persona_sections (persona_id, key, content) values ($1, 'profile', '{"role":"Designer"}')`, [persona]));
  await asUser(db, alice, () => db.query(
    `insert into public.persona_evidence (persona_id, kind, content, source_label, confidence)
     values ($1, 'quote', 'I never know what to charge', 'Interview P2', 'medium'),
            ($1, 'assumption', 'Prefers mobile', null, null)`, [persona]));
});

afterAll(async () => { await db.close(); });

describe("personas", () => {
  it("default to an unvalidated hypothesis draft owned by the caller", async () => {
    const r = await db.query<{ persona_type: string; status: string; current_step: number; owner_id: string }>(
      `select persona_type, status, current_step, owner_id from public.personas where id = $1`, [persona]);
    expect(r.rows[0]).toEqual({ persona_type: "hypothesis", status: "draft", current_step: 1, owner_id: alice });
  });

  it("accept the three persona types and reject anything else", async () => {
    for (const type of ["research_backed", "hypothesis", "proto"]) {
      await asUser(db, alice, () => db.query(`update public.personas set persona_type = $1 where id = $2`, [type, persona]));
    }
    await expect(asUser(db, alice, () => db.query(`update public.personas set persona_type = 'validated' where id = $1`, [persona])))
      .rejects.toThrow(/check constraint/i);
    await asUser(db, alice, () => db.query(`update public.personas set persona_type = 'hypothesis' where id = $1`, [persona]));
  });

  it("are invisible to other users and anonymous users", async () => {
    expect((await asUser(db, bob, () => db.query(`select 1 from public.personas`))).rows).toHaveLength(0);
    await expect(asUser(db, null, () => db.query(`select 1 from public.personas`))).rejects.toThrow(/permission denied/i);
  });

  it("cannot be created on, or moved to, a project the user doesn't own", async () => {
    await expect(asUser(db, bob, () => db.query(`insert into public.personas (project_id, name) values ($1, 'x')`, [aliceProject])))
      .rejects.toThrow(/row-level security/i);
    await expect(asUser(db, alice, () => db.query(`update public.personas set project_id = $1 where id = $2`, [bobProject, persona])))
      .rejects.toThrow(/row-level security/i);
  });

  it("cannot be changed or deleted by another user", async () => {
    const upd = await asUser(db, bob, () => db.query(`update public.personas set name = 'Pwned' where id = $1 returning id`, [persona]));
    const del = await asUser(db, bob, () => db.query(`delete from public.personas where id = $1 returning id`, [persona]));
    expect(upd.rows).toHaveLength(0);
    expect(del.rows).toHaveLength(0);
  });

  it("allow several personas per project", async () => {
    await asUser(db, alice, () => db.query(`insert into public.personas (project_id, name) values ($1, 'Second'), ($1, 'Third')`, [aliceProject]));
    const n = await db.query<{ n: number }>(`select count(*)::int as n from public.personas where project_id = $1`, [aliceProject]);
    expect(n.rows[0].n).toBe(3);
  });

  it("keep the completed invariant and bounded names", async () => {
    await expect(asUser(db, alice, () => db.query(`update public.personas set status = 'completed' where id = $1`, [persona])))
      .rejects.toThrow(/personas_completed_consistency/);
    await expect(asUser(db, alice, () => db.query(`update public.personas set name = '  ' where id = $1`, [persona])))
      .rejects.toThrow(/check constraint/i);
  });
});

describe("persona_sections and persona_evidence", () => {
  it("are hidden from and immutable to other users", async () => {
    for (const table of ["persona_sections", "persona_evidence"]) {
      expect((await asUser(db, bob, () => db.query(`select 1 from public.${table}`))).rows).toHaveLength(0);
      expect((await asUser(db, bob, () => db.query(`delete from public.${table} where persona_id = $1 returning id`, [persona]))).rows).toHaveLength(0);
    }
    await expect(asUser(db, bob, () => db.query(`insert into public.persona_evidence (persona_id, kind, content) values ($1, 'quote', 'fake')`, [persona])))
      .rejects.toThrow(/row-level security/i);
    await expect(asUser(db, bob, () => db.query(`insert into public.persona_sections (persona_id, key) values ($1, 'needs')`, [persona])))
      .rejects.toThrow(/row-level security/i);
  });

  it("validate evidence kind, confidence, links and size", async () => {
    const bad = (sql: string, params: unknown[]) => expect(asUser(db, alice, () => db.query(sql, params))).rejects.toThrow(/check constraint/i);
    await bad(`insert into public.persona_evidence (persona_id, kind, content) values ($1, 'rumour', 'x')`, [persona]);
    await bad(`insert into public.persona_evidence (persona_id, kind, content, confidence) values ($1, 'observation', 'x', 'certain')`, [persona]);
    await bad(`insert into public.persona_evidence (persona_id, kind, content) values ($1, 'quote', '   ')`, [persona]);
    await bad(`insert into public.persona_evidence (persona_id, kind, content, source_url) values ($1, 'research_source', 'x', 'javascript:alert(1)')`, [persona]);
    await bad(`insert into public.persona_evidence (persona_id, kind, content, origin) values ($1, 'quote', 'x', 'robot')`, [persona]);
    const ok = await asUser(db, alice, () => db.query(
      `insert into public.persona_evidence (persona_id, kind, content, source_url) values ($1, 'research_source', 'Study', 'https://example.com/study') returning id`, [persona]));
    expect(ok.rows).toHaveLength(1);
  });

  it("default to manual, unvalidated evidence", async () => {
    const r = await db.query<{ origin: string; validation_status: string }>(
      `select origin, validation_status from public.persona_evidence where kind = 'assumption'`);
    expect(r.rows[0]).toEqual({ origin: "manual", validation_status: "unvalidated" });
  });

  it("keep one section per key and bump the persona's updated_at on edits", async () => {
    await expect(asUser(db, alice, () => db.query(`insert into public.persona_sections (persona_id, key) values ($1, 'profile')`, [persona])))
      .rejects.toThrow(/persona_sections_unique_key/);
    const before = (await db.query<{ updated_at: string }>(`select updated_at from public.personas where id = $1`, [persona])).rows[0].updated_at;
    await new Promise((r) => setTimeout(r, 15));
    await asUser(db, alice, () => db.query(`update public.persona_evidence set confidence = 'high' where kind = 'quote' and persona_id = $1`, [persona]));
    const after = (await db.query<{ updated_at: string }>(`select updated_at from public.personas where id = $1`, [persona])).rows[0].updated_at;
    expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
  });
});

describe("duplicate_persona", () => {
  it("copies the persona with its sections and evidence into a new draft", async () => {
    await asUser(db, alice, () => db.query(`update public.personas set persona_type = 'proto' where id = $1`, [persona]));
    const id = await asUser(db, alice, async () => (await db.query<{ d: string }>(`select public.duplicate_persona($1) as d`, [persona])).rows[0].d);
    expect(id).not.toBe(persona);
    const copy = (await db.query<{ name: string; persona_type: string; status: string }>(`select name, persona_type, status from public.personas where id = $1`, [id])).rows[0];
    expect(copy).toEqual({ name: "Maya (copy)", persona_type: "proto", status: "draft" });
    expect((await db.query(`select 1 from public.persona_sections where persona_id = $1`, [id])).rows).toHaveLength(1);
    const evidence = await db.query<{ content: string; source_label: string | null }>(
      `select content, source_label from public.persona_evidence where persona_id = $1 order by content`, [id]);
    expect(evidence.rows.map((r) => r.content)).toContain("I never know what to charge");
    expect(evidence.rows.find((r) => r.content.startsWith("I never"))?.source_label).toBe("Interview P2");
  });

  it("refuses to copy someone else's persona or run when signed out", async () => {
    await expect(asUser(db, bob, () => db.query(`select public.duplicate_persona($1)`, [persona]))).rejects.toThrow(/not found/i);
    await expect(asUser(db, null, () => db.query(`select public.duplicate_persona($1)`, [persona]))).rejects.toThrow(/permission denied/i);
  });
});

describe("project brief and cascades", () => {
  it("adds bounded brief columns to projects without changing who can see them", async () => {
    await asUser(db, alice, () => db.query(
      `update public.projects set product_service = 'A budgeting app', target_audience = 'Freelancers', research_objectives = 'Why drop-off?' where id = $1`, [aliceProject]));
    expect((await asUser(db, bob, () => db.query(`select product_service from public.projects where id = $1`, [aliceProject]))).rows).toHaveLength(0);
    await expect(asUser(db, alice, () => db.query(`update public.projects set product_service = $1 where id = $2`, ["x".repeat(2001), aliceProject])))
      .rejects.toThrow(/check constraint/i);
  });

  it("deleting a project removes its personas, sections and evidence", async () => {
    const p = await project(alice, "Disposable");
    const id = await asUser(db, alice, async () => (await db.query<{ id: string }>(`insert into public.personas (project_id, name) values ($1, 'Tmp') returning id`, [p])).rows[0].id);
    await asUser(db, alice, () => db.query(`insert into public.persona_evidence (persona_id, kind, content) values ($1, 'observation', 'seen')`, [id]));
    await asUser(db, alice, () => db.query(`delete from public.projects where id = $1`, [p]));
    for (const t of ["personas", "persona_evidence"]) {
      const col = t === "personas" ? "id" : "persona_id";
      expect((await db.query(`select 1 from public.${t} where ${col} = $1`, [id])).rows).toHaveLength(0);
    }
  });
});
