/**
 * A minimal local stand-in for the Supabase Auth + PostgREST HTTP APIs, used
 * only for automated tests and local UI verification when no real Supabase
 * project is available. It is backed by PGlite running the real migrations, so
 * every query executes under the real RLS policies as the signed-in user.
 *
 * It implements only what this app uses. It is NOT a security reference:
 * production behaviour must be verified against a real Supabase project.
 */
import { createHmac, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { asUser, createDatabase, type Db } from "../db/helpers.ts";

const PORT = Number(process.env.FAKE_SUPABASE_PORT ?? 54321);
const JWT_SECRET = "fake-supabase-jwt-secret-for-tests-only";
const COLUMN = /^[a-z_]+$/;

type StoredUser = { id: string; email: string; password: string; meta: Record<string, unknown> };

let db: Db;
const users = new Map<string, StoredUser>(); // by email
const refreshTokens = new Map<string, string>(); // token -> user id

const b64 = (input: string | Buffer) => Buffer.from(input).toString("base64url");

function signJwt(user: StoredUser) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: "authenticated",
      aud: "authenticated",
      iat: now,
      exp: now + 3600,
      session_id: randomUUID(),
    }),
  );
  const sig = createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

function userFromBearer(req: IncomingMessage): StoredUser | null {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const parts = token?.split(".");
  if (!token || parts?.length !== 3) return null;
  const expected = createHmac("sha256", JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest("base64url");
  if (expected !== parts[2]) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (claims.exp * 1000 < Date.now()) return null;
    return [...users.values()].find((u) => u.id === claims.sub) ?? null;
  } catch {
    return null;
  }
}

const publicUser = (u: StoredUser) => ({
  id: u.id,
  aud: "authenticated",
  role: "authenticated",
  email: u.email,
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: u.meta,
  created_at: new Date().toISOString(),
});

function session(u: StoredUser) {
  const refresh = randomUUID();
  refreshTokens.set(refresh, u.id);
  return {
    access_token: signJwt(u),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: refresh,
    user: publicUser(u),
  };
}

function send(res: ServerResponse, status: number, body?: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString();
  return text ? JSON.parse(text) : {};
}

async function handleAuth(req: IncomingMessage, res: ServerResponse, url: URL) {
  const route = url.pathname.replace("/auth/v1", "");
  const body = req.method === "GET" ? {} : await readJson(req);

  if (route === "/signup" && req.method === "POST") {
    const email = String(body.email).toLowerCase();
    if (users.has(email)) return send(res, 422, { code: "user_already_exists", msg: "User already registered" });
    if (String(body.password).length < 6) return send(res, 422, { code: "weak_password", msg: "Weak password" });
    const meta = (body.data ?? {}) as Record<string, unknown>;
    const id = randomUUID();
    await serialised(() =>
      db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)`, [id, email, JSON.stringify(meta)]),
    );
    const user = { id, email, password: String(body.password), meta };
    users.set(email, user);
    return send(res, 200, session(user));
  }

  if (route === "/token" && req.method === "POST") {
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const user = users.get(String(body.email).toLowerCase());
      if (!user || user.password !== body.password) {
        return send(res, 400, { code: "invalid_credentials", error_code: "invalid_credentials", msg: "Invalid login credentials" });
      }
      return send(res, 200, session(user));
    }
    if (grant === "refresh_token") {
      const id = refreshTokens.get(body.refresh_token);
      const user = [...users.values()].find((u) => u.id === id);
      if (!user) return send(res, 400, { code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
      refreshTokens.delete(body.refresh_token);
      return send(res, 200, session(user));
    }
  }

  if (route === "/user") {
    const user = userFromBearer(req);
    if (!user) return send(res, 401, { code: "bad_jwt", msg: "invalid JWT" });
    if (req.method === "PUT") {
      if (body.password) {
        if (body.password === user.password) return send(res, 422, { code: "same_password", msg: "same password" });
        user.password = body.password;
      }
    }
    return send(res, 200, publicUser(user));
  }

  if (route === "/logout") return send(res, 204);
  if (route === "/recover") return send(res, 200, {});
  if (route === "/.well-known/jwks.json") return send(res, 200, { keys: [] });
  return send(res, 404, { msg: "not implemented" });
}

/** Translates the PostgREST subset this app uses into parameterised SQL. */
function buildWhere(url: URL, params: unknown[]) {
  const clauses: string[] = [];
  const bind = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const condition = (column: string, expr: string): string => {
    if (!COLUMN.test(column)) throw new Error("bad column");
    const [op, ...rest] = expr.split(".");
    const value = rest.join(".");
    if (op === "eq") return `"${column}" = ${bind(value)}`;
    if (op === "neq") return `"${column}" <> ${bind(value)}`;
    if (op === "ilike") return `"${column}" ilike ${bind(value)}`;
    if (op === "in") {
      const list = value.replace(/^\(|\)$/g, "").split(",").map((v) => v.replace(/^"|"$/g, ""));
      return `"${column}" = any(${bind(list)}::text[])`;
    }
    throw new Error(`unsupported operator ${op}`);
  };
  for (const [key, value] of url.searchParams) {
    if (["select", "order", "limit", "offset", "columns"].includes(key)) continue;
    if (key === "or") {
      const inner = value.replace(/^\(|\)$/g, "").split(/,(?=[a-z_]+\.)/);
      clauses.push(`(${inner.map((part) => {
        const [column, ...rest] = part.split(".");
        return condition(column, rest.join("."));
      }).join(" or ")})`);
    } else {
      clauses.push(condition(key, value));
    }
  }
  return clauses.length ? ` where ${clauses.join(" and ")}` : "";
}

/**
 * One PGlite connection backs every request, and `asUser` switches role/claims on it.
 * Serialise access so concurrent requests (parallel tests) can never see each other's identity.
 */
let lock: Promise<unknown> = Promise.resolve();
function serialised<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.catch(() => undefined);
  return run;
}
const asUserLocked: typeof asUser = (database, userId, fn) => serialised(() => asUser(database, userId, fn));

const jsonParam = (value: unknown) => (value !== null && typeof value === "object" ? JSON.stringify(value) : value);

async function handleRpc(req: IncomingMessage, res: ServerResponse, url: URL) {
  const fn = url.pathname.replace("/rest/v1/rpc/", "");
  const user = userFromBearer(req);
  const args = await readJson(req);
  const calls: Record<string, { sql: string; params: unknown[]; scalar?: boolean }> = {
    duplicate_research_plan: { sql: "select public.duplicate_research_plan($1::uuid) as r", params: [args.p_plan_id], scalar: true },
    reorder_research_plan_sections: {
      sql: "select public.reorder_research_plan_sections($1::uuid, $2::text[])",
      params: [args.p_plan_id, args.p_keys],
    },
  };
  const call = calls[fn];
  if (!call) return send(res, 404, { message: "function not found" });
  try {
    const result = await asUserLocked(db, user?.id ?? null, () => db.query<{ r: unknown }>(call.sql, call.params));
    return call.scalar ? send(res, 200, result.rows[0].r) : send(res, 204);
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    return send(res, /not found/i.test(message) ? 400 : /permission denied/i.test(message) ? 403 : 500, {
      code: /not found/i.test(message) ? "P0002" : "42501",
      message,
    });
  }
}

async function handleRest(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (url.pathname.startsWith("/rest/v1/rpc/")) return handleRpc(req, res, url);
  const table = url.pathname.replace("/rest/v1/", "");
  if (!["profiles", "projects", "project_members", "project_settings", "research_plans", "research_plan_sections"].includes(table)) {
    return send(res, 404, { message: "not found" });
  }
  const user = userFromBearer(req);
  const prefer = String(req.headers.prefer ?? "");
  const wantsObject = String(req.headers.accept ?? "").includes("vnd.pgrst.object");
  const params: unknown[] = [];

  try {
    const result = await asUserLocked(db, user?.id ?? null, async () => {
      let sql: string;
      if (req.method === "GET" || req.method === "HEAD") {
        sql = `select * from public.${table}${buildWhere(url, params)}`;
        const order = url.searchParams.get("order");
        if (order) {
          const parts = order.split(",").flatMap((o) => {
            const [col, dir] = o.split(".");
            return COLUMN.test(col) ? [`"${col}" ${dir === "asc" ? "asc" : "desc"}`] : [];
          });
          if (parts.length) sql += ` order by ${parts.join(", ")}`;
        }
        const limit = Number(url.searchParams.get("limit"));
        if (limit > 0) sql += ` limit ${Math.floor(limit)}`;
      } else if (req.method === "POST") {
        const body = await readJson(req);
        const rows = Array.isArray(body) ? body : [body];
        const columns = Object.keys(rows[0]).filter((c) => COLUMN.test(c));
        const values = rows.map((row) => `(${columns.map((c) => { params.push(jsonParam(row[c])); return `$${params.length}`; }).join(", ")})`);
        sql = `insert into public.${table} (${columns.map((c) => `"${c}"`).join(", ")}) values ${values.join(", ")} returning *`;
      } else if (req.method === "PATCH") {
        const body = await readJson(req);
        const sets = Object.keys(body).filter((c) => COLUMN.test(c)).map((c) => { params.push(jsonParam(body[c])); return `"${c}" = $${params.length}`; });
        sql = `update public.${table} set ${sets.join(", ")}${buildWhere(url, params)} returning *`;
      } else if (req.method === "DELETE") {
        sql = `delete from public.${table}${buildWhere(url, params)} returning *`;
      } else {
        throw new Error("method not supported");
      }
      return db.query<Record<string, unknown>>(sql, params);
    });

    const rows = result.rows;
    const range = `${rows.length ? `0-${rows.length - 1}` : "*"}/${rows.length}`;
    const headers: Record<string, string> = prefer.includes("count=") ? { "content-range": range } : {};

    if (req.method === "HEAD") return send(res, 200, undefined, headers);
    if (req.method !== "GET" && !prefer.includes("return=representation")) return send(res, 201, undefined, headers);
    if (wantsObject) {
      if (rows.length !== 1) {
        return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${rows.length} rows` });
      }
      return send(res, 200, rows[0], headers);
    }
    return send(res, req.method === "POST" ? 201 : 200, rows, headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    const rls = /row-level security/i.test(message);
    const denied = /permission denied/i.test(message);
    const check = /check constraint/i.test(message);
    return send(res, rls || denied ? 403 : check ? 400 : 500, {
      code: rls ? "42501" : denied ? "42501" : check ? "23514" : "XX000",
      message,
    });
  }
}

async function main() {
  db = await createDatabase();
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    // Watchdog: say so loudly if a request is still unanswered after 8s, instead of hanging silently.
    const startedAt = Date.now();
    const watchdog = setTimeout(
      () => console.error(`[fake-supabase] HUNG after ${Date.now() - startedAt}ms: ${req.method} ${url.pathname}${url.search.slice(0, 80)}`),
      8000,
    );
    res.on("close", () => clearTimeout(watchdog));
    try {
      if (req.method === "OPTIONS") return send(res, 204, undefined, { "access-control-allow-origin": "*" });
      if (url.pathname === "/__health") return send(res, 200, { ok: true });
      if (url.pathname.startsWith("/auth/v1")) return await handleAuth(req, res, url);
      if (url.pathname.startsWith("/rest/v1/")) return await handleRest(req, res, url);
      return send(res, 404, { message: "not found" });
    } catch (error) {
      console.error("[fake-supabase]", error);
      return send(res, 500, { message: "internal error" });
    }
  });
  server.listen(PORT, "127.0.0.1", () => console.log(`fake supabase listening on :${PORT}`));
}

void main();
