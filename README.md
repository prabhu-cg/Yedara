# Yedara — Research Workspace (Phase 1 foundation)

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · shadcn/ui-style components (Radix) · Supabase (Postgres, Auth) · React Hook Form + Zod · Vitest · Playwright.

Phase 1 delivers auth, project management, the app shell and coming-soon entry points for the six research tools. The tools themselves are not built yet.

## Setup

1. `npm install`
2. Create a Supabase project. In **Authentication → URL Configuration** add `http://localhost:3000/auth/callback` (and your production URL) to the redirect allow-list.
3. Apply the migrations in `supabase/migrations/` (in order): `supabase link --project-ref <ref> && supabase db push`, or paste each file into the SQL editor.
4. `cp .env.example .env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. `npm run dev` → http://localhost:3000

The app never uses the service-role key. Access control is Row Level Security plus server-side checks.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Run / build / serve |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm run test:unit` | Vitest: validation, actions, navigation, **RLS policies on real Postgres (PGlite)** |
| `npm run test:e2e` | Playwright on desktop, tablet and mobile viewports |
| `npm run db:types` | Regenerate `database.types.ts` from a linked project |

E2E runs against a local fake of the Supabase API (`tests/support/fake-supabase.ts`) backed by the real migrations and RLS, so no cloud project is needed. To run against a real project: `E2E_USE_REAL_SUPABASE=1 npm run test:e2e` (email confirmation must be off for that project).

## Deploying to Vercel

Import the repo, set the three env vars from `.env.example` (`NEXT_PUBLIC_SITE_URL` = production URL), and deploy. No other configuration is needed.

## Structure

- `src/app` routes: `(auth)`, `(app)` (authenticated shell), `auth/callback`
- `src/lib/auth`, `src/lib/projects` schemas, queries, server actions
- `src/config` navigation and research-tool registry (add a tool by flipping its `status`)
- `src/lib/rate-limit.ts` pluggable limiter; swap in a shared store before shipping AI endpoints
- `supabase/migrations` schema and RLS
