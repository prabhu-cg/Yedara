import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createDatabase, createUser, type Db } from "./helpers";

let db: Db;
let alice: string;
let bob: string;
let project: string;
let bobProject: string;
let analysis: string;
let otherAnalysis: string;
let acme: string;
let globex: string;
let foreign: string;
let price: string;
let features: string;
let source: string;

const one = async <T = { id: string }>(user: string, sql: string, params: unknown[] = []) =>
  asUser(db, user, async () => (await db.query<T>(sql, params)).rows[0]);
const id = async (user: string, sql: string, params: unknown[] = []) => (await one<{ id: string }>(user, sql, params)).id;

beforeAll(async () => {
  db = await createDatabase();
  alice = await createUser(db, "alice@example.com");
  bob = await createUser(db, "bob@example.com");
  project = await id(alice, `insert into public.projects (name, owner_id) values ('P', $1) returning id`, [alice]);
  bobProject = await id(bob, `insert into public.projects (name, owner_id) values ('B', $1) returning id`, [bob]);
  analysis = await id(alice, `insert into public.competitor_analyses (project_id, title) values ($1, 'Market scan') returning id`, [project]);
  otherAnalysis = await id(alice, `insert into public.competitor_analyses (project_id, title) values ($1, 'Another') returning id`, [project]);
  acme = await id(alice, `insert into public.competitors (analysis_id, name, competitor_type) values ($1, 'Acme', 'direct') returning id`, [analysis]);
  globex = await id(alice, `insert into public.competitors (analysis_id, name, competitor_type) values ($1, 'Globex', 'emerging') returning id`, [analysis]);
  foreign = await id(alice, `insert into public.competitors (analysis_id, name) values ($1, 'Elsewhere') returning id`, [otherAnalysis]);
  price = await id(alice, `insert into public.competitor_criteria (analysis_id, name, category) values ($1, 'Pricing', 'pricing') returning id`, [analysis]);
  features = await id(alice, `insert into public.competitor_criteria (analysis_id, name, category) values ($1, 'Core features', 'core_features') returning id`, [analysis]);
  source = await id(alice, `insert into public.competitor_sources (analysis_id, competitor_id, url, retrieved_on) values ($1, $2, 'https://acme.example/pricing', '2026-10-01') returning id`, [analysis, acme]);
});

afterAll(async () => { await db.close(); });

describe("competitor_analyses", () => {
  it("default to a draft owned by the caller, and are private", async () => {
    const r = await db.query<{ status: string; owner_id: string }>(`select status, owner_id from public.competitor_analyses where id = $1`, [analysis]);
    expect(r.rows[0]).toEqual({ status: "draft", owner_id: alice });
    expect((await asUser(db, bob, () => db.query(`select 1 from public.competitor_analyses`))).rows).toHaveLength(0);
    await expect(asUser(db, null, () => db.query(`select 1 from public.competitor_analyses`))).rejects.toThrow(/permission denied/i);
  });

  it("cannot be created on, or moved to, a project the user doesn't own", async () => {
    await expect(asUser(db, bob, () => db.query(`insert into public.competitor_analyses (project_id, title) values ($1, 'x')`, [project]))).rejects.toThrow(/row-level security/i);
    await expect(asUser(db, alice, () => db.query(`update public.competitor_analyses set project_id = $1 where id = $2`, [bobProject, analysis]))).rejects.toThrow(/row-level security/i);
  });

  it("store structured context and analysis as bounded JSON objects", async () => {
    await asUser(db, alice, () => db.query(`update public.competitor_analyses set market_context = '{"geography":"EU"}', analysis = '{"strengths":["a"]}' where id = $1`, [analysis]));
    await expect(asUser(db, alice, () => db.query(`update public.competitor_analyses set analysis = '[1]' where id = $1`, [analysis]))).rejects.toThrow(/check constraint/i);
  });
});

describe("competitors", () => {
  it("validate type, name and website scheme", async () => {
    const bad = (sql: string) => expect(asUser(db, alice, () => db.query(sql, [analysis]))).rejects.toThrow(/check constraint/i);
    await bad(`insert into public.competitors (analysis_id, name, competitor_type) values ($1, 'x', 'frenemy')`);
    await bad(`insert into public.competitors (analysis_id, name) values ($1, '  ')`);
    await bad(`insert into public.competitors (analysis_id, name, website_url) values ($1, 'x', 'javascript:alert(1)')`);
    await bad(`insert into public.competitors (analysis_id, name, website_url) values ($1, 'x', 'ftp://example.com')`);
    for (const type of ["direct", "indirect", "substitute", "emerging"]) {
      await asUser(db, alice, () => db.query(`update public.competitors set competitor_type = $1 where id = $2`, [type, acme]));
    }
    await asUser(db, alice, () => db.query(`update public.competitors set competitor_type = 'direct' where id = $1`, [acme]));
  });

  it("are hidden from and immutable to other users, who also can't add to someone else's analysis", async () => {
    expect((await asUser(db, bob, () => db.query(`select 1 from public.competitors`))).rows).toHaveLength(0);
    expect((await asUser(db, bob, () => db.query(`update public.competitors set name = 'Pwned' where id = $1 returning id`, [acme]))).rows).toHaveLength(0);
    await expect(asUser(db, bob, () => db.query(`insert into public.competitors (analysis_id, name) values ($1, 'Sneaky')`, [analysis]))).rejects.toThrow(/row-level security/i);
  });

  it("keep their order through the reorder RPC, and the RPC respects ownership", async () => {
    await asUser(db, alice, () => db.query(`select public.reorder_competitors($1, array[$2, $3]::uuid[])`, [analysis, globex, acme]));
    const order = await db.query<{ name: string }>(`select name from public.competitors where analysis_id = $1 order by position`, [analysis]);
    expect(order.rows.map((r) => r.name)).toEqual(["Globex", "Acme"]);
    await asUser(db, bob, () => db.query(`select public.reorder_competitors($1, array[$2, $3]::uuid[])`, [analysis, acme, globex]));
    expect((await db.query<{ name: string }>(`select name from public.competitors where analysis_id = $1 order by position`, [analysis])).rows[0].name).toBe("Globex");
  });
});

describe("competitor_criteria", () => {
  it("validate category and enforce unique names per analysis (case-insensitive)", async () => {
    await expect(asUser(db, alice, () => db.query(`insert into public.competitor_criteria (analysis_id, name, category) values ($1, 'x', 'vibes')`, [analysis]))).rejects.toThrow(/check constraint/i);
    await expect(asUser(db, alice, () => db.query(`insert into public.competitor_criteria (analysis_id, name) values ($1, ' PRICING ')`, [analysis]))).rejects.toThrow(/competitor_criteria_unique_name/);
    // The same name is fine in a different analysis.
    const ok = await asUser(db, alice, () => db.query(`insert into public.competitor_criteria (analysis_id, name) values ($1, 'Pricing') returning id`, [otherAnalysis]));
    expect(ok.rows).toHaveLength(1);
  });

  it("support custom criteria and are private", async () => {
    const custom = await one<{ category: string }>(alice, `insert into public.competitor_criteria (analysis_id, name) values ($1, 'Onboarding speed') returning category`, [analysis]);
    expect(custom.category).toBe("custom");
    expect((await asUser(db, bob, () => db.query(`select 1 from public.competitor_criteria`))).rows).toHaveLength(0);
    await expect(asUser(db, bob, () => db.query(`insert into public.competitor_criteria (analysis_id, name) values ($1, 'x')`, [analysis]))).rejects.toThrow(/row-level security/i);
  });
});

describe("competitor_sources", () => {
  it("record URL, type and retrieval date, and reject unsafe links", async () => {
    const r = await db.query<{ source_type: string; retrieved_on: string; origin: string }>(`select source_type, retrieved_on::text, origin from public.competitor_sources where id = $1`, [source]);
    expect(r.rows[0]).toEqual({ source_type: "website", retrieved_on: "2026-10-01", origin: "manual" });
    await expect(asUser(db, alice, () => db.query(`insert into public.competitor_sources (analysis_id, competitor_id, url) values ($1, $2, 'javascript:alert(1)')`, [analysis, acme]))).rejects.toThrow(/check constraint/i);
    await expect(asUser(db, alice, () => db.query(`insert into public.competitor_sources (analysis_id, competitor_id, url, origin) values ($1, $2, 'https://a.example', 'scraper')`, [analysis, acme]))).rejects.toThrow(/check constraint/i);
  });

  it("must belong to a competitor in the same analysis", async () => {
    await expect(asUser(db, alice, () => db.query(`insert into public.competitor_sources (analysis_id, competitor_id, url) values ($1, $2, 'https://a.example')`, [analysis, foreign]))).rejects.toThrow(/foreign key/i);
  });
});

describe("competitor_comparisons (the matrix)", () => {
  it("default to unknown and keep one cell per competitor and criterion", async () => {
    const cell = await one<{ status: string; id: string }>(alice, `insert into public.competitor_comparisons (analysis_id, competitor_id, criterion_id) values ($1, $2, $3) returning id, status`, [analysis, acme, price]);
    expect(cell.status).toBe("unknown");
    await expect(asUser(db, alice, () => db.query(`insert into public.competitor_comparisons (analysis_id, competitor_id, criterion_id) values ($1, $2, $3)`, [analysis, acme, price]))).rejects.toThrow(/competitor_comparisons_unique_cell/);
  });

  it("represent unknown, unavailable and not-applicable explicitly, and reject other states", async () => {
    for (const status of ["known", "unknown", "unavailable", "not_applicable"]) {
      await asUser(db, alice, () => db.query(`update public.competitor_comparisons set status = $1 where competitor_id = $2 and criterion_id = $3`, [status, acme, price]));
    }
    await expect(asUser(db, alice, () => db.query(`update public.competitor_comparisons set status = 'weak' where competitor_id = $1`, [acme]))).rejects.toThrow(/check constraint/i);
  });

  it("cannot mix competitors, criteria or sources from different analyses", async () => {
    const insert = (c: string, k: string, src: string | null = null) =>
      asUser(db, alice, () => db.query(`insert into public.competitor_comparisons (analysis_id, competitor_id, criterion_id, source_id) values ($1, $2, $3, $4)`, [analysis, c, k, src]));
    await expect(insert(foreign, price)).rejects.toThrow(/foreign key/i);
    const foreignCriterion = await id(alice, `insert into public.competitor_criteria (analysis_id, name) values ($1, 'Foreign criterion') returning id`, [otherAnalysis]);
    await expect(insert(globex, foreignCriterion)).rejects.toThrow(/foreign key/i);
    // A source belongs to one competitor: Globex cannot cite Acme's source.
    await expect(insert(globex, features, source)).rejects.toThrow(/foreign key/i);
    await expect(insert(acme, features, source)).resolves.toBeTruthy();
  });

  it("keep the cell (and its text) when its cited source is deleted", async () => {
    await asUser(db, alice, () => db.query(`update public.competitor_comparisons set value = 'Free tier', status = 'known' where competitor_id = $1 and criterion_id = $2`, [acme, features]));
    await asUser(db, alice, () => db.query(`delete from public.competitor_sources where id = $1`, [source]));
    const cell = await db.query<{ value: string; source_id: string | null }>(`select value, source_id from public.competitor_comparisons where competitor_id = $1 and criterion_id = $2`, [acme, features]);
    expect(cell.rows[0]).toEqual({ value: "Free tier", source_id: null });
  });

  it("are private to the analysis owner", async () => {
    expect((await asUser(db, bob, () => db.query(`select 1 from public.competitor_comparisons`))).rows).toHaveLength(0);
    await expect(asUser(db, bob, () => db.query(`insert into public.competitor_comparisons (analysis_id, competitor_id, criterion_id) values ($1, $2, $3)`, [analysis, globex, price]))).rejects.toThrow(/row-level security/i);
    expect((await asUser(db, bob, () => db.query(`update public.competitor_comparisons set value = 'x' returning id`))).rows).toHaveLength(0);
  });
});

describe("cascades and bookkeeping", () => {
  it("bump the analysis timestamp when any child changes", async () => {
    const before = (await db.query<{ updated_at: string }>(`select updated_at from public.competitor_analyses where id = $1`, [analysis])).rows[0].updated_at;
    await new Promise((r) => setTimeout(r, 15));
    await asUser(db, alice, () => db.query(`update public.competitor_comparisons set notes = 'seen on pricing page' where competitor_id = $1 and criterion_id = $2`, [acme, features]));
    const after = (await db.query<{ updated_at: string }>(`select updated_at from public.competitor_analyses where id = $1`, [analysis])).rows[0].updated_at;
    expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  it("deleting a competitor removes its sources and matrix cells; deleting a criterion removes its cells", async () => {
    await asUser(db, alice, () => db.query(`delete from public.competitors where id = $1`, [globex]));
    expect((await db.query(`select 1 from public.competitor_comparisons where competitor_id = $1`, [globex])).rows).toHaveLength(0);
    await asUser(db, alice, () => db.query(`delete from public.competitor_criteria where id = $1`, [price]));
    expect((await db.query(`select 1 from public.competitor_comparisons where criterion_id = $1`, [price])).rows).toHaveLength(0);
  });

  it("deleting a project removes its analyses and everything inside them", async () => {
    await asUser(db, alice, () => db.query(`delete from public.projects where id = $1`, [project]));
    for (const t of ["competitor_analyses", "competitors", "competitor_criteria", "competitor_sources", "competitor_comparisons"]) {
      expect((await db.query(`select 1 from public.${t}`)).rows, t).toHaveLength(0);
    }
  });
});
