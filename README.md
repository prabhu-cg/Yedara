# Yedara — Research Workspace (Phase 1 foundation)

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · shadcn/ui-style components (Radix) · Supabase (Postgres, Auth) · React Hook Form + Zod · Vitest · Playwright.

Phase 1 delivers auth, project management and the app shell. Phase 2 adds the **Research Planner** (`/tools/research-planner`). The other five research tools are still coming-soon pages.

## Setup

1. `npm install`
2. Create a Supabase project. In **Authentication → URL Configuration** add `http://localhost:3000/auth/callback` (and your production URL) to the redirect allow-list.
3. Apply the migrations in `supabase/migrations/` (in order, three files): `supabase link --project-ref <ref> && supabase db push`, or paste each file's *contents* into the SQL editor. Phase 2 adds `20260101000200_research_planner.sql`.
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

## Research Planner (Phase 2)

A 7-step guided workflow (context, goals, methods, participants, materials, logistics, review) that turns a project brief into a research plan. It autosaves, can be resumed later, and exports to PDF, Word and Markdown.

- **Data:** `research_plans` (owner, project, draft/completed, current step) and `research_plan_sections` (one row per section, validated JSONB content, ordering, `source` of manual/template/ai). RLS: a plan is visible and editable only by its owner, and can only attach to a project the owner owns. `duplicate_research_plan` and `reorder_research_plan_sections` are `SECURITY INVOKER` RPCs, so they run under the caller's RLS.
- **Methodology guidance** (`src/lib/research-planner/methods.ts`) is deterministic keyword matching. It only *suggests*, always labelled optional, and never selects anything for the user.
- **Starter materials** (`materials.ts`) are generated from the user's answers and only for the selected methods. They are drafts with `[bracketed]` placeholders.
- **Exports** all render one document model (`document.ts`), so the preview, Markdown, PDF (`@react-pdf/renderer`) and DOCX (`docx`) cannot drift apart. Download route: `GET /api/research-plans/[planId]/export?format=md|pdf|docx` (authenticated, rate limited, 404 for plans you don't own).
- **AI readiness:** `src/lib/ai/planner-ai.ts` defines the service interface and ships it disabled. Providers must return the same section schemas the editors use.

### Known limitations

- PDF uses the built-in Helvetica font: characters outside Latin text are replaced with `?`. DOCX uses Calibri (Word substitutes if it is missing).
- Two browser tabs editing the same plan: the last save wins (no conflict detection yet).
- Method guidance is English keyword matching, not language understanding.
- Section order is changed with up/down buttons, not drag and drop.
- Starter usability tasks are placeholders: the planner can't know what your users should do.
