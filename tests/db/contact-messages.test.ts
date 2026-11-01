import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createDatabase, createUser, type Db } from "./helpers";

let db: Db;
let alice: string;

beforeAll(async () => {
  db = await createDatabase();
  alice = await createUser(db, "alice@example.com");
});
afterAll(() => db.close());

const insert = (user: string | null, topic = "general", message = "A real question about exports.") =>
  asUser(db, user, () =>
    db.query(`insert into public.contact_messages (name, email, topic, message) values ('Sam', 'sam@example.com', $1, $2)`, [topic, message]),
  );

describe("contact_messages RLS", () => {
  it("lets anonymous and signed-in visitors send a message", async () => {
    await expect(insert(null)).resolves.toBeDefined();
    await expect(insert(alice)).resolves.toBeDefined();
  });

  it("never lets API clients read, change or delete messages", async () => {
    await expect(asUser(db, null, () => db.query(`select * from public.contact_messages`))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, alice, () => db.query(`select * from public.contact_messages`))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, alice, () => db.query(`update public.contact_messages set name = 'x'`))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, alice, () => db.query(`delete from public.contact_messages`))).rejects.toThrow(/permission denied/);
  });

  it("enforces topic and length constraints in the database", async () => {
    await expect(insert(null, "sales")).rejects.toThrow();
    await expect(insert(null, "general", "short")).rejects.toThrow();
    await expect(insert(null, "general", "x".repeat(4001))).rejects.toThrow();
  });
});
