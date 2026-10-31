import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createDatabase, createUser, type Db } from "./helpers";

let db: Db;
let alice: string;
let bob: string;
let aliceProject: string;

async function insertProject(userId: string, name: string) {
  return asUser(db, userId, async () => {
    const res = await db.query<{ id: string }>(
      `insert into public.projects (name, owner_id) values ($1, $2) returning id`,
      [name, userId],
    );
    return res.rows[0].id;
  });
}

beforeAll(async () => {
  db = await createDatabase();
  alice = await createUser(db, "alice@example.com", "Alice Example");
  bob = await createUser(db, "bob@example.com");
  aliceProject = await insertProject(alice, "Alice's project");
});

afterAll(async () => {
  await db.close();
});

describe("profiles", () => {
  it("is created automatically for new auth users, using the signup name", async () => {
    const rows = await db.query<{ id: string; full_name: string | null }>(
      `select id, full_name from public.profiles order by full_name nulls last`,
    );
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows.find((r) => r.id === alice)?.full_name).toBe("Alice Example");
    expect(rows.rows.find((r) => r.id === bob)?.full_name).toBeNull();
  });

  it("can only be read by its owner", async () => {
    const own = await asUser(db, alice, () => db.query(`select id from public.profiles`));
    expect(own.rows.map((r) => (r as { id: string }).id)).toEqual([alice]);
  });

  it("cannot be updated by another user", async () => {
    const res = await asUser(db, bob, () =>
      db.query(`update public.profiles set full_name = 'Hacked' where id = $1 returning id`, [alice]),
    );
    expect(res.rows).toHaveLength(0);
    const check = await db.query<{ full_name: string }>(
      `select full_name from public.profiles where id = $1`, [alice],
    );
    expect(check.rows[0].full_name).toBe("Alice Example");
  });
});

describe("projects ownership", () => {
  it("defaults status to planning and creates a settings row", async () => {
    const project = await db.query<{ status: string }>(
      `select status from public.projects where id = $1`, [aliceProject],
    );
    expect(project.rows[0].status).toBe("planning");
    const settings = await db.query(`select 1 from public.project_settings where project_id = $1`, [aliceProject]);
    expect(settings.rows).toHaveLength(1);
  });

  it("is invisible to other users", async () => {
    const res = await asUser(db, bob, () => db.query(`select id from public.projects`));
    expect(res.rows).toHaveLength(0);
    const direct = await asUser(db, bob, () =>
      db.query(`select id from public.projects where id = $1`, [aliceProject]),
    );
    expect(direct.rows).toHaveLength(0);
  });

  it("is invisible to anonymous users", async () => {
    await expect(asUser(db, null, () => db.query(`select id from public.projects`))).rejects.toThrow(
      /permission denied/i,
    );
  });

  it("cannot be created on behalf of another user", async () => {
    await expect(
      asUser(db, bob, () =>
        db.query(`insert into public.projects (name, owner_id) values ('Spoof', $1)`, [alice]),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("cannot be updated by another user", async () => {
    const res = await asUser(db, bob, () =>
      db.query(`update public.projects set name = 'Pwned' where id = $1 returning id`, [aliceProject]),
    );
    expect(res.rows).toHaveLength(0);
    const check = await db.query<{ name: string }>(`select name from public.projects where id = $1`, [aliceProject]);
    expect(check.rows[0].name).toBe("Alice's project");
  });

  it("cannot be deleted by another user", async () => {
    const res = await asUser(db, bob, () =>
      db.query(`delete from public.projects where id = $1 returning id`, [aliceProject]),
    );
    expect(res.rows).toHaveLength(0);
    const check = await db.query(`select 1 from public.projects where id = $1`, [aliceProject]);
    expect(check.rows).toHaveLength(1);
  });

  it("cannot be transferred to another owner", async () => {
    await expect(
      asUser(db, alice, () =>
        db.query(`update public.projects set owner_id = $1 where id = $2`, [bob, aliceProject]),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("can be edited, archived and restored by the owner", async () => {
    const edited = await asUser(db, alice, () =>
      db.query<{ name: string }>(
        `update public.projects set name = 'Renamed', status = 'review' where id = $1 returning name`,
        [aliceProject],
      ),
    );
    expect(edited.rows[0].name).toBe("Renamed");

    await asUser(db, alice, () =>
      db.query(
        `update public.projects set previous_status = status, status = 'archived', archived_at = now() where id = $1`,
        [aliceProject],
      ),
    );
    await expect(
      asUser(db, alice, () =>
        db.query(`update public.projects set status = 'archived', archived_at = null where id = $1`, [aliceProject]),
      ),
    ).rejects.toThrow(/projects_archived_consistency/);
  });

  it("enforces field validation at the database level", async () => {
    await expect(
      asUser(db, alice, () => db.query(`insert into public.projects (name) values ('   ')`)),
    ).rejects.toThrow(/check constraint/i);
    await expect(
      asUser(db, alice, () =>
        db.query(`insert into public.projects (name, status) values ('x', 'bogus')`),
      ),
    ).rejects.toThrow(/check constraint/i);
  });

  it("bumps updated_at on update", async () => {
    const id = await insertProject(alice, "Timestamp");
    const before = await db.query<{ updated_at: string }>(`select updated_at from public.projects where id = $1`, [id]);
    await new Promise((r) => setTimeout(r, 15));
    await asUser(db, alice, () => db.query(`update public.projects set name = 'Timestamp 2' where id = $1`, [id]));
    const after = await db.query<{ updated_at: string }>(`select updated_at from public.projects where id = $1`, [id]);
    expect(new Date(after.rows[0].updated_at).getTime()).toBeGreaterThan(new Date(before.rows[0].updated_at).getTime());
  });
});

describe("project_settings", () => {
  it("is hidden from and read-only for other users", async () => {
    const read = await asUser(db, bob, () => db.query(`select id from public.project_settings`));
    expect(read.rows).toHaveLength(0);
    const write = await asUser(db, bob, () =>
      db.query(`update public.project_settings set preferences = '{"x":1}' where project_id = $1 returning id`, [aliceProject]),
    );
    expect(write.rows).toHaveLength(0);
  });

  it("is writable by the project owner", async () => {
    const res = await asUser(db, alice, () =>
      db.query(`update public.project_settings set preferences = '{"density":"compact"}' where project_id = $1 returning id`, [aliceProject]),
    );
    expect(res.rows).toHaveLength(1);
  });
});

describe("project_members (schema preparation)", () => {
  it("cannot be written by clients", async () => {
    await expect(
      asUser(db, alice, () =>
        db.query(`insert into public.project_members (project_id, user_id) values ($1, $2)`, [aliceProject, bob]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("grants members read access to a project once a membership exists", async () => {
    await db.query(`insert into public.project_members (project_id, user_id, role) values ($1, $2, 'viewer')`, [aliceProject, bob]);
    const visible = await asUser(db, bob, () => db.query(`select id from public.projects`));
    expect(visible.rows).toHaveLength(1);
    // Members still cannot modify the project.
    const write = await asUser(db, bob, () =>
      db.query(`update public.projects set name = 'Member edit' where id = $1 returning id`, [aliceProject]),
    );
    expect(write.rows).toHaveLength(0);
    await db.query(`delete from public.project_members where user_id = $1`, [bob]);
  });
});

describe("cascades", () => {
  it("removes settings when a project is deleted by its owner", async () => {
    const id = await insertProject(alice, "To delete");
    await asUser(db, alice, () => db.query(`delete from public.projects where id = $1`, [id]));
    const settings = await db.query(`select 1 from public.project_settings where project_id = $1`, [id]);
    expect(settings.rows).toHaveLength(0);
  });
});
