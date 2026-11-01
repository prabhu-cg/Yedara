import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createDatabase, createUser, type Db } from "./helpers";

let db: Db;
let alice: string;
let bob: string;
let aliceProject: string;
let bobProject: string;
let synthesis: string;
let otherSynthesis: string;
let bobSynthesis: string;
let board: string;
let source: string;
const obs: string[] = [];
let persona: string;
let bobPersona: string;

const q = <T extends object>(user: string | null, sql: string, params: unknown[] = []) =>
  asUser(db, user, async () => (await db.query<T>(sql, params)).rows);
const id = async (user: string, sql: string, params: unknown[] = []) => (await q<{ id: string }>(user, sql, params))[0].id;

beforeAll(async () => {
  db = await createDatabase();
  alice = await createUser(db, "alice@example.com");
  bob = await createUser(db, "bob@example.com");
  aliceProject = await id(alice, `insert into public.projects (name, owner_id) values ('A', $1) returning id`, [alice]);
  bobProject = await id(bob, `insert into public.projects (name, owner_id) values ('B', $1) returning id`, [bob]);
  persona = await id(alice, `insert into public.personas (project_id, name) values ($1, 'Maya') returning id`, [aliceProject]);
  bobPersona = await id(bob, `insert into public.personas (project_id, name) values ($1, 'Bo') returning id`, [bobProject]);

  synthesis = await id(alice, `insert into public.research_syntheses (project_id, title) values ($1, 'Onboarding') returning id`, [aliceProject]);
  otherSynthesis = await id(alice, `insert into public.research_syntheses (project_id, title) values ($1, 'Other') returning id`, [aliceProject]);
  bobSynthesis = await id(bob, `insert into public.research_syntheses (project_id, title) values ($1, 'Bobs') returning id`, [bobProject]);
  board = await id(alice, `insert into public.affinity_boards (synthesis_id) values ($1) returning id`, [synthesis]);
  source = await id(alice, `insert into public.research_sources (synthesis_id, name, source_type) values ($1, 'Interview P1', 'interview') returning id`, [synthesis]);
  for (const text of ["Could not find the pricing", "Liked the quick setup", "Gave up at the bank step"]) {
    obs.push(await id(alice, `insert into public.research_observations (synthesis_id, source_id, participant_ref, content, tags) values ($1, $2, 'P1', $3, '["pricing"]') returning id`, [synthesis, source, text]));
  }
  for (const [i, o] of obs.entries()) {
    await q(alice, `insert into public.affinity_cards (synthesis_id, board_id, observation_id, position) values ($1, $2, $3, $4)`, [synthesis, board, o, i]);
  }
});

afterAll(async () => { await db.close(); });

describe("syntheses: ownership", () => {
  it("are invisible to other users and refuse anonymous access", async () => {
    expect(await q(bob, `select 1 from public.research_syntheses where id = $1`, [synthesis])).toHaveLength(0);
    await expect(q(null, `select 1 from public.research_syntheses`)).rejects.toThrow(/permission denied/i);
  });

  it("cannot be created on, or moved to, a project the user does not own", async () => {
    await expect(q(bob, `insert into public.research_syntheses (project_id, title) values ($1, 'x')`, [aliceProject])).rejects.toThrow(/row-level security/i);
    await expect(q(alice, `update public.research_syntheses set project_id = $1 where id = $2`, [bobProject, synthesis])).rejects.toThrow(/row-level security/i);
  });

  it("hide every child table from other users", async () => {
    for (const table of ["research_sources", "research_observations", "affinity_boards", "affinity_cards"]) {
      expect(await q(bob, `select 1 from public.${table}`)).toHaveLength(0);
    }
  });

  it("cannot have children written by someone else", async () => {
    await expect(q(bob, `insert into public.research_observations (synthesis_id, content) values ($1, 'planted')`, [synthesis])).rejects.toThrow(/row-level security/i);
    await expect(q(bob, `insert into public.research_sources (synthesis_id, name) values ($1, 'planted')`, [synthesis])).rejects.toThrow(/row-level security/i);
    expect(await q(bob, `update public.research_observations set content = 'hacked' where id = $1 returning id`, [obs[0]])).toHaveLength(0);
    expect(await q(bob, `delete from public.research_observations where id = $1 returning id`, [obs[0]])).toHaveLength(0);
  });

  it("require a title and a consistent completed state", async () => {
    await expect(q(alice, `insert into public.research_syntheses (project_id, title) values ($1, '   ')`, [aliceProject])).rejects.toThrow(/check constraint/i);
    await expect(q(alice, `update public.research_syntheses set status = 'completed' where id = $1`, [synthesis])).rejects.toThrow(/check constraint/i);
  });
});

describe("observations and sources: integrity", () => {
  it("only accept a source from the same synthesis", async () => {
    await expect(q(alice, `insert into public.research_observations (synthesis_id, source_id, content) values ($1, $2, 'x')`, [otherSynthesis, source])).rejects.toThrow(/foreign key/i);
  });

  it("validate kinds, tags and size", async () => {
    await expect(q(alice, `insert into public.research_observations (synthesis_id, kind, content) values ($1, 'rumour', 'x')`, [synthesis])).rejects.toThrow(/check constraint/i);
    await expect(q(alice, `insert into public.research_observations (synthesis_id, content, tags) values ($1, 'x', '"pricing"')`, [synthesis])).rejects.toThrow(/check constraint/i);
    await expect(q(alice, `insert into public.research_observations (synthesis_id, content) values ($1, $2)`, [synthesis, "x".repeat(2001)])).rejects.toThrow(/check constraint/i);
    await expect(q(alice, `insert into public.research_observations (synthesis_id, content) values ($1, '  ')`, [synthesis])).rejects.toThrow(/check constraint/i);
  });

  it("limit what is recorded about a file to a name and a bounded size", async () => {
    await expect(q(alice, `insert into public.research_sources (synthesis_id, name, file_name, file_size, import_method) values ($1, 'f', 'notes.txt', 9999999, 'file')`, [synthesis])).rejects.toThrow(/check constraint/i);
    await q(alice, `insert into public.research_sources (synthesis_id, name, file_name, file_size, import_method) values ($1, 'f', 'notes.txt', 1200, 'file')`, [synthesis]);
    const cols = await q<{ column_name: string }>(alice, `select column_name from information_schema.columns where table_name = 'research_sources'`);
    expect(cols.map((c) => c.column_name)).not.toContain("storage_path");
    expect(cols.map((c) => c.column_name)).not.toContain("file_data");
  });

  it("deleting a source keeps its observations, unlinked", async () => {
    const s = await id(alice, `insert into public.research_sources (synthesis_id, name) values ($1, 'Temp') returning id`, [synthesis]);
    const o = await id(alice, `insert into public.research_observations (synthesis_id, source_id, content) values ($1, $2, 'kept') returning id`, [synthesis, s]);
    await q(alice, `delete from public.research_sources where id = $1`, [s]);
    const rows = await q<{ source_id: string | null }>(alice, `select source_id from public.research_observations where id = $1`, [o]);
    expect(rows).toEqual([{ source_id: null }]);
    await q(alice, `delete from public.research_observations where id = $1`, [o]);
  });

  it("touch the synthesis when they change", async () => {
    const before = (await q<{ updated_at: string }>(alice, `select updated_at from public.research_syntheses where id = $1`, [synthesis]))[0].updated_at;
    await new Promise((r) => setTimeout(r, 15));
    await q(alice, `update public.research_observations set content = 'Could not find the pricing page' where id = $1`, [obs[0]]);
    const after = (await q<{ updated_at: string }>(alice, `select updated_at from public.research_syntheses where id = $1`, [synthesis]))[0].updated_at;
    expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
  });
});

describe("affinity board", () => {
  it("has one board per synthesis and one card per observation", async () => {
    await expect(q(alice, `insert into public.affinity_boards (synthesis_id) values ($1)`, [synthesis])).rejects.toThrow(/unique/i);
    await expect(q(alice, `insert into public.affinity_cards (synthesis_id, board_id, observation_id) values ($1, $2, $3)`, [synthesis, board, obs[0]])).rejects.toThrow(/unique/i);
  });

  it("refuses a card for an observation from another synthesis", async () => {
    const foreign = await id(alice, `insert into public.research_observations (synthesis_id, content) values ($1, 'elsewhere') returning id`, [otherSynthesis]);
    await expect(q(alice, `insert into public.affinity_cards (synthesis_id, board_id, observation_id) values ($1, $2, $3)`, [synthesis, board, foreign])).rejects.toThrow(/foreign key/i);
  });

  it("saves themes and card placement in one step, and removing a theme ungroups its cards", async () => {
    const t1 = "11111111-1111-4111-8111-111111111111";
    const t2 = "22222222-2222-4222-8222-222222222222";
    await q(alice, `select public.save_affinity_layout($1, $2::jsonb, $3::jsonb)`, [
      synthesis,
      JSON.stringify([{ id: t1, title: "Pricing", position: 0 }, { id: t2, title: "Setup", notes: "Fast", position: 1 }]),
      JSON.stringify([{ id: (await cardIds())[0], theme_id: t1, position: 0 }, { id: (await cardIds())[1], theme_id: t2, position: 0 }, { id: (await cardIds())[2], theme_id: t1, position: 1 }]),
    ]);
    let cards = await q<{ theme_id: string | null }>(alice, `select theme_id from public.affinity_cards where synthesis_id = $1 order by position, created_at`, [synthesis]);
    expect(cards.filter((c) => c.theme_id === t1)).toHaveLength(2);

    // Dropping t1 from the layout deletes the theme; its cards go back to "not grouped".
    const [c0, c1, c2] = await cardIds();
    await q(alice, `select public.save_affinity_layout($1, $2::jsonb, $3::jsonb)`, [
      synthesis,
      JSON.stringify([{ id: t2, title: "Setup renamed", position: 0 }]),
      JSON.stringify([{ id: c0, theme_id: null, position: 0 }, { id: c1, theme_id: t2, position: 0 }, { id: c2, theme_id: null, position: 1 }]),
    ]);
    expect((await q<{ title: string }>(alice, `select title from public.research_themes where synthesis_id = $1`, [synthesis]))).toEqual([{ title: "Setup renamed" }]);
    cards = await q(alice, `select theme_id from public.affinity_cards where synthesis_id = $1`, [synthesis]);
    expect(cards.filter((c) => c.theme_id === null)).toHaveLength(2);
  });

  it("rolls back entirely when part of a layout is invalid", async () => {
    const [c0] = await cardIds();
    await expect(q(alice, `select public.save_affinity_layout($1, $2::jsonb, $3::jsonb)`, [
      synthesis,
      JSON.stringify([{ id: "33333333-3333-4333-8333-333333333333", title: "Fine", position: 0 }, { id: "44444444-4444-4444-8444-444444444444", title: "   ", position: 1 }]),
      JSON.stringify([{ id: c0, theme_id: null, position: 0 }]),
    ])).rejects.toThrow(/check constraint/i);
    const titles = (await q<{ title: string }>(alice, `select title from public.research_themes where synthesis_id = $1`, [synthesis])).map((t) => t.title);
    expect(titles).not.toContain("Fine");
  });

  it("will not save into, or reveal, someone else's synthesis", async () => {
    await expect(q(bob, `select public.save_affinity_layout($1, '[]'::jsonb, '[]'::jsonb)`, [synthesis])).rejects.toThrow(/not found/i);
    await expect(q(alice, `select public.save_affinity_layout($1, '{}'::jsonb, '[]'::jsonb)`, [synthesis])).rejects.toThrow(/invalid layout/i);
  });

  it("cannot be repointed at another synthesis's theme", async () => {
    const foreignTheme = await id(alice, `insert into public.research_themes (synthesis_id, title) values ($1, 'Elsewhere') returning id`, [otherSynthesis]);
    const [c0] = await cardIds();
    await expect(q(alice, `update public.affinity_cards set theme_id = $1 where id = $2`, [foreignTheme, c0])).rejects.toThrow(/foreign key/i);
  });

  it("keeps the zoom within bounds", async () => {
    await expect(q(alice, `update public.affinity_boards set zoom = 3 where id = $1`, [board])).rejects.toThrow(/check constraint/i);
    await q(alice, `update public.affinity_boards set zoom = 0.75 where id = $1`, [board]);
  });
});

async function cardIds() {
  return (await q<{ id: string }>(alice, `select c.id from public.affinity_cards c join public.research_observations o on o.id = c.observation_id where c.synthesis_id = $1 and o.id = any($2::uuid[]) order by o.created_at, o.id`, [synthesis, obs])).map((r) => r.id);
}

describe("insights and their evidence", () => {
  let insight: string;

  it("record the kind and confidence, and reject unknown values", async () => {
    insight = await id(alice, `insert into public.research_insights (synthesis_id, kind, statement, confidence, problem_kind) values ($1, 'hypothesis', 'People abandon at the bank step', 'low', 'problem') returning id`, [synthesis]);
    await expect(q(alice, `insert into public.research_insights (synthesis_id, kind, statement) values ($1, 'fact', 'x')`, [synthesis])).rejects.toThrow(/check constraint/i);
    await expect(q(alice, `insert into public.research_insights (synthesis_id, statement, confidence) values ($1, 'x', 'certain')`, [synthesis])).rejects.toThrow(/check constraint/i);
    await expect(q(alice, `insert into public.research_insights (synthesis_id, statement) values ($1, '  ')`, [synthesis])).rejects.toThrow(/check constraint/i);
  });

  it("link only to observations from the same synthesis", async () => {
    await q(alice, `insert into public.research_insight_evidence (synthesis_id, insight_id, observation_id) values ($1, $2, $3)`, [synthesis, insight, obs[2]]);
    const foreign = await id(alice, `insert into public.research_observations (synthesis_id, content) values ($1, 'foreign') returning id`, [otherSynthesis]);
    await expect(q(alice, `insert into public.research_insight_evidence (synthesis_id, insight_id, observation_id) values ($1, $2, $3)`, [synthesis, insight, foreign])).rejects.toThrow(/foreign key/i);
    await expect(q(alice, `insert into public.research_insight_evidence (synthesis_id, insight_id, observation_id) values ($1, $2, $3)`, [synthesis, insight, obs[2]])).rejects.toThrow(/unique|duplicate/i);
  });

  it("lose the link, not the insight, when an observation is deleted", async () => {
    const o = await id(alice, `insert into public.research_observations (synthesis_id, content) values ($1, 'temp') returning id`, [synthesis]);
    await q(alice, `insert into public.research_insight_evidence (synthesis_id, insight_id, observation_id) values ($1, $2, $3)`, [synthesis, insight, o]);
    await q(alice, `delete from public.research_observations where id = $1`, [o]);
    expect((await q(alice, `select 1 from public.research_insight_evidence where insight_id = $1`, [insight])).length).toBe(1);
    expect((await q(alice, `select 1 from public.research_insights where id = $1`, [insight])).length).toBe(1);
  });

  it("become unthemed, not deleted, when their theme is removed", async () => {
    const t = await id(alice, `insert into public.research_themes (synthesis_id, title) values ($1, 'Temp theme') returning id`, [synthesis]);
    await q(alice, `update public.research_insights set theme_id = $1 where id = $2`, [t, insight]);
    await q(alice, `delete from public.research_themes where id = $1`, [t]);
    expect((await q<{ theme_id: string | null }>(alice, `select theme_id from public.research_insights where id = $1`, [insight]))[0].theme_id).toBeNull();
  });

  it("are hidden from other users", async () => {
    expect(await q(bob, `select 1 from public.research_insights`)).toHaveLength(0);
    expect(await q(bob, `select 1 from public.research_insight_evidence`)).toHaveLength(0);
    await expect(q(bob, `insert into public.research_insight_evidence (synthesis_id, insight_id, observation_id) values ($1, $2, $3)`, [synthesis, insight, obs[0]])).rejects.toThrow(/row-level security/i);
  });
});

describe("deleting a synthesis", () => {
  it("removes all of its material and nothing else", async () => {
    const s = await id(alice, `insert into public.research_syntheses (project_id, title) values ($1, 'Doomed') returning id`, [aliceProject]);
    const b = await id(alice, `insert into public.affinity_boards (synthesis_id) values ($1) returning id`, [s]);
    const o = await id(alice, `insert into public.research_observations (synthesis_id, content) values ($1, 'x') returning id`, [s]);
    await q(alice, `insert into public.affinity_cards (synthesis_id, board_id, observation_id) values ($1, $2, $3)`, [s, b, o]);
    const i = await id(alice, `insert into public.research_insights (synthesis_id, statement) values ($1, 's') returning id`, [s]);
    await q(alice, `insert into public.research_insight_evidence (synthesis_id, insight_id, observation_id) values ($1, $2, $3)`, [s, i, o]);
    await q(alice, `delete from public.research_syntheses where id = $1`, [s]);
    for (const table of ["research_observations", "affinity_boards", "affinity_cards", "research_insights", "research_insight_evidence"]) {
      expect(await q(alice, `select 1 from public.${table} where synthesis_id = $1`, [s])).toHaveLength(0);
    }
    expect((await q(alice, `select 1 from public.research_observations where synthesis_id = $1`, [synthesis])).length).toBeGreaterThan(0);
  });

  it("goes with its project", async () => {
    const p = await id(alice, `insert into public.projects (name, owner_id) values ('Gone', $1) returning id`, [alice]);
    const s = await id(alice, `insert into public.research_syntheses (project_id, title) values ($1, 'In gone') returning id`, [p]);
    await q(alice, `delete from public.projects where id = $1`, [p]);
    expect(await q(alice, `select 1 from public.research_syntheses where id = $1`, [s])).toHaveLength(0);
  });
});

describe("journeys", () => {
  let journey: string;
  const stages: string[] = [];

  it("belong to the caller and a project they own", async () => {
    journey = await id(alice, `insert into public.journeys (project_id, persona_id, name, scenario, state) values ($1, $2, 'Onboarding', 'First week', 'current') returning id`, [aliceProject, persona]);
    expect(await q(bob, `select 1 from public.journeys`)).toHaveLength(0);
    await expect(q(null, `select 1 from public.journeys`)).rejects.toThrow(/permission denied/i);
    await expect(q(bob, `insert into public.journeys (project_id, name) values ($1, 'x')`, [aliceProject])).rejects.toThrow(/row-level security/i);
  });

  it("only use a persona from their own project", async () => {
    await expect(q(alice, `insert into public.journeys (project_id, persona_id, name) values ($1, $2, 'x')`, [aliceProject, bobPersona])).rejects.toThrow(/row-level security/i);
    const otherProject = await id(alice, `insert into public.projects (name, owner_id) values ('Second', $1) returning id`, [alice]);
    await expect(q(alice, `insert into public.journeys (project_id, persona_id, name) values ($1, $2, 'x')`, [otherProject, persona])).rejects.toThrow(/row-level security/i);
  });

  it("validate type, state and name", async () => {
    await expect(q(alice, `insert into public.journeys (project_id, name, journey_type) values ($1, 'x', 'dream')`, [aliceProject])).rejects.toThrow(/check constraint/i);
    await expect(q(alice, `insert into public.journeys (project_id, name, state) values ($1, 'x', 'someday')`, [aliceProject])).rejects.toThrow(/check constraint/i);
    await expect(q(alice, `insert into public.journeys (project_id, name) values ($1, ' ')`, [aliceProject])).rejects.toThrow(/check constraint/i);
  });

  it("keep the journey when its persona is deleted", async () => {
    const p = await id(alice, `insert into public.personas (project_id, name) values ($1, 'Temp') returning id`, [aliceProject]);
    const j = await id(alice, `insert into public.journeys (project_id, persona_id, name) values ($1, $2, 'Keeps') returning id`, [aliceProject, p]);
    await q(alice, `delete from public.personas where id = $1`, [p]);
    expect((await q<{ persona_id: string | null }>(alice, `select persona_id from public.journeys where id = $1`, [j]))[0].persona_id).toBeNull();
  });

  it("hold ordered stages with an optional 1-5 emotion", async () => {
    for (const [i, name] of ["Discover", "Sign up", "First task"].entries()) {
      stages.push(await id(alice, `insert into public.journey_stages (journey_id, name, position, emotion) values ($1, $2, $3, $4) returning id`, [journey, name, i * 10, [4, 2, null][i]]));
    }
    await expect(q(alice, `insert into public.journey_stages (journey_id, name, emotion) values ($1, 's', 6)`, [journey])).rejects.toThrow(/check constraint/i);
    await expect(q(alice, `insert into public.journey_stages (journey_id, name, emotion) values ($1, 's', 0)`, [journey])).rejects.toThrow(/check constraint/i);
    const rows = await q<{ emotion: number | null }>(alice, `select emotion from public.journey_stages where journey_id = $1 order by position`, [journey]);
    expect(rows.map((r) => r.emotion)).toEqual([4, 2, null]); // unrated stays null, never neutral
  });

  it("reorder stages in one call", async () => {
    await q(alice, `select public.reorder_journey_stages($1, $2::uuid[])`, [journey, [stages[2], stages[0], stages[1]]]);
    const names = (await q<{ name: string }>(alice, `select name from public.journey_stages where journey_id = $1 order by position`, [journey])).map((r) => r.name);
    expect(names).toEqual(["First task", "Discover", "Sign up"]);
  });

  it("will not reorder someone else's stages", async () => {
    await q(bob, `select public.reorder_journey_stages($1, $2::uuid[])`, [journey, [stages[1], stages[0], stages[2]]]);
    const names = (await q<{ name: string }>(alice, `select name from public.journey_stages where journey_id = $1 order by position`, [journey])).map((r) => r.name);
    expect(names).toEqual(["First task", "Discover", "Sign up"]);
  });

  it("keep items inside their own journey and stage", async () => {
    const other = await id(alice, `insert into public.journeys (project_id, name) values ($1, 'Other') returning id`, [aliceProject]);
    await expect(q(alice, `insert into public.journey_items (journey_id, stage_id, kind, content) values ($1, $2, 'action', 'x')`, [other, stages[0]])).rejects.toThrow(/foreign key/i);
    await expect(q(alice, `insert into public.journey_items (journey_id, stage_id, kind, content) values ($1, $2, 'mood', 'x')`, [journey, stages[0]])).rejects.toThrow(/check constraint/i);
    await expect(q(alice, `insert into public.journey_items (journey_id, stage_id, kind, content) values ($1, $2, 'action', '  ')`, [journey, stages[0]])).rejects.toThrow(/check constraint/i);
    await expect(q(bob, `insert into public.journey_items (journey_id, stage_id, kind, content) values ($1, $2, 'action', 'planted')`, [journey, stages[0]])).rejects.toThrow(/row-level security/i);
  });

  it("link evidence only to observations the caller owns", async () => {
    await q(alice, `insert into public.journey_items (journey_id, stage_id, kind, content, evidence_note, observation_id) values ($1, $2, 'pain_point', 'Cannot find pricing', 'P1 said so', $3)`, [journey, stages[0], obs[0]]);
    const bobObs = await id(bob, `insert into public.research_observations (synthesis_id, content) values ($1, 'private') returning id`, [bobSynthesis]);
    await expect(q(alice, `insert into public.journey_items (journey_id, stage_id, kind, content, observation_id) values ($1, $2, 'pain_point', 'x', $3)`, [journey, stages[0], bobObs])).rejects.toThrow(/row-level security/i);
  });

  it("drop the link, not the item, when the observation is deleted", async () => {
    const o = await id(alice, `insert into public.research_observations (synthesis_id, content) values ($1, 'link me') returning id`, [synthesis]);
    const item = await id(alice, `insert into public.journey_items (journey_id, stage_id, kind, content, observation_id) values ($1, $2, 'opportunity', 'Show pricing', $3) returning id`, [journey, stages[1], o]);
    await q(alice, `delete from public.research_observations where id = $1`, [o]);
    expect((await q<{ observation_id: string | null }>(alice, `select observation_id from public.journey_items where id = $1`, [item]))[0].observation_id).toBeNull();
  });

  it("copy a journey with its stages and items, optionally as a future state", async () => {
    const copy = (await q<{ r: string }>(alice, `select public.duplicate_journey($1, 'future') as r`, [journey]))[0].r;
    const row = (await q<{ name: string; state: string; status: string }>(alice, `select name, state, status from public.journeys where id = $1`, [copy]))[0];
    expect(row).toEqual({ name: "Onboarding (copy)", state: "future", status: "draft" });
    const copiedStages = await q<{ id: string; name: string }>(alice, `select id, name from public.journey_stages where journey_id = $1 order by position`, [copy]);
    expect(copiedStages.map((s) => s.name)).toEqual(["First task", "Discover", "Sign up"]);
    const items = await q<{ stage_id: string; journey_id: string }>(alice, `select stage_id, journey_id from public.journey_items where journey_id = $1`, [copy]);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => copiedStages.some((s) => s.id === i.stage_id))).toBe(true);
    await expect(q(bob, `select public.duplicate_journey($1)`, [journey])).rejects.toThrow(/not found/i);
  });

  it("turn pain points and opportunities into candidates that keep their origin", async () => {
    const item = (await q<{ id: string }>(alice, `select id from public.journey_items where journey_id = $1 and kind = 'pain_point'`, [journey]))[0].id;
    const cand = await id(alice, `insert into public.opportunity_candidates (project_id, journey_id, stage_id, source_item_id, observation_id, title, origin_kind, journey_name, stage_name, evidence_note) values ($1, $2, $3, $4, $5, 'Cannot find pricing', 'pain_point', 'Onboarding', 'Discover', 'P1 said so') returning id`, [aliceProject, journey, stages[0], item, obs[0]]);
    await expect(q(alice, `insert into public.opportunity_candidates (project_id, source_item_id, title, origin_kind) values ($1, $2, 'dup', 'pain_point')`, [aliceProject, item])).rejects.toThrow(/unique/i);
    await expect(q(alice, `insert into public.opportunity_candidates (project_id, title, origin_kind) values ($1, 'x', 'idea')`, [aliceProject])).rejects.toThrow(/check constraint/i);
    // Deleting the stage and item keeps the candidate and the names it was created with.
    await q(alice, `delete from public.journey_stages where id = $1`, [stages[0]]);
    const row = (await q<{ stage_id: string | null; source_item_id: string | null; stage_name: string; journey_name: string }>(alice, `select stage_id, source_item_id, stage_name, journey_name from public.opportunity_candidates where id = $1`, [cand]))[0];
    expect(row).toEqual({ stage_id: null, source_item_id: null, stage_name: "Discover", journey_name: "Onboarding" });
  });

  it("keep candidates private and tied to the caller's own journeys", async () => {
    expect(await q(bob, `select 1 from public.opportunity_candidates`)).toHaveLength(0);
    await expect(q(bob, `insert into public.opportunity_candidates (project_id, journey_id, title, origin_kind) values ($1, $2, 'x', 'opportunity')`, [bobProject, journey])).rejects.toThrow(/row-level security/i);
    await expect(q(bob, `insert into public.opportunity_candidates (project_id, title, origin_kind) values ($1, 'x', 'opportunity')`, [aliceProject])).rejects.toThrow(/row-level security/i);
  });

  it("delete with their project, stages and items included", async () => {
    const p = await id(alice, `insert into public.projects (name, owner_id) values ('Doomed', $1) returning id`, [alice]);
    const j = await id(alice, `insert into public.journeys (project_id, name) values ($1, 'J') returning id`, [p]);
    const s = await id(alice, `insert into public.journey_stages (journey_id, name) values ($1, 'S') returning id`, [j]);
    await q(alice, `insert into public.journey_items (journey_id, stage_id, kind, content) values ($1, $2, 'action', 'a')`, [j, s]);
    await q(alice, `delete from public.projects where id = $1`, [p]);
    expect(await q(alice, `select 1 from public.journey_stages where journey_id = $1`, [j])).toHaveLength(0);
    expect(await q(alice, `select 1 from public.journey_items where journey_id = $1`, [j])).toHaveLength(0);
  });
});
