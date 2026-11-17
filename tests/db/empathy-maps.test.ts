import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createDatabase, createUser, type Db } from "./helpers";

let db: Db;
let alice: string;
let bob: string;
let aliceProject: string;
let aliceOtherProject: string;
let bobProject: string;
let persona: string;
let otherProjectPersona: string;
let bobPersona: string;
let aliceObs: string;
let bobObs: string;

const q = <T extends object>(user: string | null, sql: string, params: unknown[] = []) =>
  asUser(db, user, async () => (await db.query<T>(sql, params)).rows);
const id = async (user: string, sql: string, params: unknown[] = []) => (await q<{ id: string }>(user, sql, params))[0].id;
const rejects = async (user: string | null, sql: string, params: unknown[] = []) => {
  let failed = false;
  try {
    await q(user, sql, params);
  } catch {
    failed = true;
  }
  return failed;
};
const newMap = (user: string, project: string, extra = "") =>
  id(user, `insert into public.empathy_maps (project_id, title, subject) values ($1, 'Maya on a weeknight', 'Weeknight planner') ${extra} returning id`, [project]);

beforeAll(async () => {
  db = await createDatabase();
  alice = await createUser(db, "alice@example.com");
  bob = await createUser(db, "bob@example.com");
  aliceProject = await id(alice, `insert into public.projects (name, owner_id) values ('A', $1) returning id`, [alice]);
  aliceOtherProject = await id(alice, `insert into public.projects (name, owner_id) values ('A2', $1) returning id`, [alice]);
  bobProject = await id(bob, `insert into public.projects (name, owner_id) values ('B', $1) returning id`, [bob]);
  persona = await id(alice, `insert into public.personas (project_id, name) values ($1, 'Maya') returning id`, [aliceProject]);
  otherProjectPersona = await id(alice, `insert into public.personas (project_id, name) values ($1, 'Zed') returning id`, [aliceOtherProject]);
  bobPersona = await id(bob, `insert into public.personas (project_id, name) values ($1, 'Bo') returning id`, [bobProject]);
  const aliceSynthesis = await id(alice, `insert into public.research_syntheses (project_id, title) values ($1, 'S') returning id`, [aliceProject]);
  const bobSynthesis = await id(bob, `insert into public.research_syntheses (project_id, title) values ($1, 'S') returning id`, [bobProject]);
  aliceObs = await id(alice, `insert into public.research_observations (synthesis_id, content) values ($1, 'I never trust the estimate') returning id`, [aliceSynthesis]);
  bobObs = await id(bob, `insert into public.research_observations (synthesis_id, content) values ($1, 'Bobs note') returning id`, [bobSynthesis]);
});

afterAll(async () => {
  await db.close();
});

describe("empathy maps: ownership and links", () => {
  it("lets the owner create, read, update and delete a map, with no persona needed", async () => {
    const map = await newMap(alice, aliceProject);
    const [row] = await q<{ persona_id: string | null; status: string; not_researched: string[] }>(alice, `select persona_id, status, not_researched from public.empathy_maps where id = $1`, [map]);
    expect(row).toEqual({ persona_id: null, status: "draft", not_researched: [] });
    await q(alice, `update public.empathy_maps set title = 'Renamed' where id = $1`, [map]);
    expect((await q<{ title: string }>(alice, `select title from public.empathy_maps where id = $1`, [map]))[0].title).toBe("Renamed");
    await q(alice, `delete from public.empathy_maps where id = $1`, [map]);
    expect(await q(alice, `select 1 from public.empathy_maps where id = $1`, [map])).toHaveLength(0);
  });

  it("hides one person's maps and notes from another, and from signed-out visitors", async () => {
    const map = await newMap(alice, aliceProject);
    await q(alice, `insert into public.empathy_items (map_id, quadrant, content) values ($1, 'says', 'Hello')`, [map]);
    expect(await q(bob, `select 1 from public.empathy_maps where id = $1`, [map])).toHaveLength(0);
    expect(await q(bob, `select 1 from public.empathy_items where map_id = $1`, [map])).toHaveLength(0);
    expect(await rejects(null, `select 1 from public.empathy_maps`)).toBe(true);
    expect((await q(bob, `update public.empathy_maps set title = 'Hacked' where id = $1 returning id`, [map]))).toHaveLength(0);
    expect((await q(bob, `delete from public.empathy_maps where id = $1 returning id`, [map]))).toHaveLength(0);
  });

  it("refuses a map in someone else's project, or one that claims another owner", async () => {
    expect(await rejects(alice, `insert into public.empathy_maps (project_id, title) values ($1, 'x')`, [bobProject])).toBe(true);
    expect(await rejects(alice, `insert into public.empathy_maps (owner_id, project_id, title) values ($1, $2, 'x')`, [bob, aliceProject])).toBe(true);
  });

  it("accepts a persona from the same project and refuses any other", async () => {
    expect(await newMap(alice, aliceProject, "")).toBeTruthy();
    await q(alice, `insert into public.empathy_maps (project_id, persona_id, title) values ($1, $2, 'Linked')`, [aliceProject, persona]);
    expect(await rejects(alice, `insert into public.empathy_maps (project_id, persona_id, title) values ($1, $2, 'x')`, [aliceProject, otherProjectPersona])).toBe(true);
    expect(await rejects(alice, `insert into public.empathy_maps (project_id, persona_id, title) values ($1, $2, 'x')`, [aliceProject, bobPersona])).toBe(true);
    const map = await newMap(alice, aliceProject);
    expect(await rejects(alice, `update public.empathy_maps set persona_id = $2 where id = $1`, [map, otherProjectPersona])).toBe(true);
  });

  it("keeps the map and its typed subject when the persona is deleted", async () => {
    const throwaway = await id(alice, `insert into public.personas (project_id, name) values ($1, 'Temp') returning id`, [aliceProject]);
    const map = await id(alice, `insert into public.empathy_maps (project_id, persona_id, title, subject) values ($1, $2, 'T', 'Temp') returning id`, [aliceProject, throwaway]);
    await q(alice, `delete from public.personas where id = $1`, [throwaway]);
    const [row] = await q<{ persona_id: string | null; subject: string }>(alice, `select persona_id, subject from public.empathy_maps where id = $1`, [map]);
    expect(row).toEqual({ persona_id: null, subject: "Temp" });
  });
});

describe("empathy maps: validation", () => {
  it("only allows the four quadrants, and not-researched flags drawn from them", async () => {
    const map = await newMap(alice, aliceProject);
    expect(await rejects(alice, `insert into public.empathy_items (map_id, quadrant, content) values ($1, 'wants', 'x')`, [map])).toBe(true);
    await q(alice, `update public.empathy_maps set not_researched = array['thinks','feels'] where id = $1`, [map]);
    expect(await rejects(alice, `update public.empathy_maps set not_researched = array['pains'] where id = $1`, [map])).toBe(true);
  });

  it("rejects empty or oversized text and keeps completion consistent", async () => {
    const map = await newMap(alice, aliceProject);
    expect(await rejects(alice, `insert into public.empathy_items (map_id, quadrant, content) values ($1, 'says', '   ')`, [map])).toBe(true);
    expect(await rejects(alice, `insert into public.empathy_items (map_id, quadrant, content) values ($1, 'says', $2)`, [map, "x".repeat(501)])).toBe(true);
    expect(await rejects(alice, `insert into public.empathy_maps (project_id, title) values ($1, '  ')`, [aliceProject])).toBe(true);
    expect(await rejects(alice, `update public.empathy_maps set status = 'completed' where id = $1`, [map])).toBe(true);
    await q(alice, `update public.empathy_maps set status = 'completed', completed_at = now() where id = $1`, [map]);
  });
});

describe("empathy maps: evidence", () => {
  it("lets a note cite an observation the owner has, and refuses someone else's", async () => {
    const map = await newMap(alice, aliceProject);
    await q(alice, `insert into public.empathy_items (map_id, quadrant, content, observation_id) values ($1, 'says', 'I never trust the estimate', $2)`, [map, aliceObs]);
    expect(await rejects(alice, `insert into public.empathy_items (map_id, quadrant, content, observation_id) values ($1, 'says', 'x', $2)`, [map, bobObs])).toBe(true);
    const item = await id(alice, `select id from public.empathy_items where map_id = $1`, [map]);
    expect(await rejects(alice, `update public.empathy_items set observation_id = $2 where id = $1`, [item, bobObs])).toBe(true);
  });

  it("keeps the note, now an assumption, when the observation is deleted", async () => {
    const map = await newMap(alice, aliceProject);
    const synthesis = await id(alice, `select id from public.research_syntheses where project_id = $1`, [aliceProject]);
    const obs = await id(alice, `insert into public.research_observations (synthesis_id, content) values ($1, 'temporary') returning id`, [synthesis]);
    const item = await id(alice, `insert into public.empathy_items (map_id, quadrant, content, observation_id) values ($1, 'does', 'Scrolled back', $2) returning id`, [map, obs]);
    await q(alice, `delete from public.research_observations where id = $1`, [obs]);
    const [row] = await q<{ observation_id: string | null }>(alice, `select observation_id from public.empathy_items where id = $1`, [item]);
    expect(row.observation_id).toBeNull();
  });

  it("stops another user adding notes to a map they don't own", async () => {
    const map = await newMap(alice, aliceProject);
    expect(await rejects(bob, `insert into public.empathy_items (map_id, quadrant, content) values ($1, 'says', 'x')`, [map])).toBe(true);
  });
});

describe("empathy maps: behaviour", () => {
  it("touches the map when a note changes", async () => {
    const map = await newMap(alice, aliceProject);
    await db.query(`update public.empathy_maps set updated_at = now() - interval '1 day' where id = $1`, [map]);
    await q(alice, `insert into public.empathy_items (map_id, quadrant, content) values ($1, 'feels', 'Anxious')`, [map]);
    const [row] = await db.query<{ fresh: boolean }>(`select updated_at > now() - interval '1 minute' as fresh from public.empathy_maps where id = $1`, [map]).then((r) => r.rows);
    expect(row.fresh).toBe(true);
  });

  it("reorders notes within a quadrant", async () => {
    const map = await newMap(alice, aliceProject);
    const ids: string[] = [];
    for (const text of ["one", "two", "three"]) ids.push(await id(alice, `insert into public.empathy_items (map_id, quadrant, content) values ($1, 'says', $2) returning id`, [map, text]));
    await q(alice, `select public.reorder_empathy_items($1, $2::uuid[])`, [map, [ids[2], ids[0], ids[1]]]);
    const rows = await q<{ content: string }>(alice, `select content from public.empathy_items where map_id = $1 order by position`, [map]);
    expect(rows.map((r) => r.content)).toEqual(["three", "one", "two"]);
  });

  it("duplicates a map as a draft with its notes and evidence, and refuses someone else's", async () => {
    const map = await id(alice, `insert into public.empathy_maps (project_id, persona_id, title, subject, not_researched, status, completed_at) values ($1, $2, 'Original', 'Maya', array['thinks'], 'completed', now()) returning id`, [aliceProject, persona]);
    await q(alice, `insert into public.empathy_items (map_id, quadrant, content, observation_id) values ($1, 'says', 'Quote', $2), ($1, 'does', 'Action', null)`, [map, aliceObs]);
    const copy = (await q<{ duplicate_empathy_map: string }>(alice, `select public.duplicate_empathy_map($1)`, [map]))[0].duplicate_empathy_map;
    const [row] = await q<{ title: string; status: string; completed_at: string | null; persona_id: string; not_researched: string[] }>(alice, `select title, status, completed_at, persona_id, not_researched from public.empathy_maps where id = $1`, [copy]);
    expect(row).toMatchObject({ title: "Original (copy)", status: "draft", completed_at: null, persona_id: persona, not_researched: ["thinks"] });
    expect(await q(alice, `select 1 from public.empathy_items where map_id = $1`, [copy])).toHaveLength(2);
    expect(await q(alice, `select 1 from public.empathy_items where map_id = $1 and observation_id = $2`, [copy, aliceObs])).toHaveLength(1);
    expect(await rejects(bob, `select public.duplicate_empathy_map($1)`, [map])).toBe(true);
  });

  it("removes a map's notes when the map or its project is deleted", async () => {
    const project = await id(alice, `insert into public.projects (name, owner_id) values ('Gone', $1) returning id`, [alice]);
    const map = await newMap(alice, project);
    await q(alice, `insert into public.empathy_items (map_id, quadrant, content) values ($1, 'says', 'x')`, [map]);
    await q(alice, `delete from public.projects where id = $1`, [project]);
    expect((await db.query(`select 1 from public.empathy_items where map_id = $1`, [map])).rows).toHaveLength(0);
  });
});
