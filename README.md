# Yedara — Research Workspace (Phase 1 foundation)

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · shadcn/ui-style components (Radix) · Supabase (Postgres, Auth) · React Hook Form + Zod · Vitest · Playwright.

Phase 1 delivers auth, project management and the app shell. Phase 2 adds the **Research Planner** (`/tools/research-planner`). Phase 3 adds the **Persona Builder** (`/tools/persona-builder`) and the **Competitor Analyzer** (`/tools/competitor-analyzer`). Phase 4 adds the **Research Synthesizer** (`/tools/research-synthesizer`) and the **Journey Mapper** (`/tools/journey-mapper`). Only the Opportunity Analyzer is still a coming-soon page.

## Setup

1. `npm install`
2. Create a Supabase project. In **Authentication → URL Configuration** add `http://localhost:3000/auth/callback` (and your production URL) to the redirect allow-list.
3. Apply the migrations in `supabase/migrations/` (in order, five files): `supabase link --project-ref <ref> && supabase db push`, or paste each file's *contents* into the SQL editor. Phase 2 adds `20260101000200_research_planner.sql`; Phase 3 adds `20260101000300_personas_competitors.sql` (new project-brief columns, personas, competitor analyses, RLS and RPCs); Phase 4 adds `20260101000400_synthesizer_journeys.sql` (research syntheses, journeys, RLS and RPCs).
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

## Persona Builder and Competitor Analyzer (Phase 3)

Both tools share the same chrome (`src/components/shared`): a step wizard with autosave, resume, validation per step and PDF / Word / Markdown export through the one document model used by the planner.

### Shared project context

A project now carries a short brief (description, industry, product or service, target audience, research objectives). Personas and analyses **read** it and may **override** any field for themselves. The override is stored in the module's own JSON (`overrides`; an absent key means "inherit") and the project is never written to. Reset removes the key. See `src/lib/shared-context.ts`.

### Persona Builder

- **Steps:** Context, Profile, Behaviour, Needs, Evidence, Output. Several personas per project; duplicate (`duplicate_persona` RPC), compare up to four side by side, edit any time.
- **Honesty rules:** every persona is *research-backed*, *hypothesis* or *proto-persona* and says so on screen and in every export. A research-backed persona needs a research source plus an observation or quote. Every quote needs a source. Demographics are only shown or exported with a recorded justification. Nothing is generated: there are no invented quotes, interviews or demographics, and no stock photos (initials stand in).
- **Data:** `personas`, `persona_sections` (one validated JSONB row per step), `persona_evidence` (typed rows with source, confidence, validation status and `origin` manual/ai).
- **AI readiness:** `src/lib/ai/persona-ai.ts` is disabled. A future provider may only propose assumptions or hypotheses, stored with `origin: 'ai'` and labelled "AI-generated assumption. Not validated with users."

### Competitor Analyzer

- **Steps:** Market context, Competitors, Criteria, Comparison matrix, Analysis, Report. Competitor types: direct, indirect, substitute, emerging. All research is entered by hand and works with no external service.
- **Matrix:** competitors are columns and criteria rows. Each cell is *known* (with a value), *unknown* (not yet researched), *not publicly available* (looked, not found) or *not applicable*, with optional notes and a source. Missing information is reported as a gap to research, never as a weakness.
- **Sources:** every source records its URL and the date it was retrieved; the report cites them as S1, S2... and lists them at the end. Strengths, weaknesses and opportunities are labelled as the researcher's interpretation, not as recorded fact.
- **Data:** `competitor_analyses` (with `market_context` and `analysis` JSON), `competitors`, `competitor_criteria`, `competitor_sources`, `competitor_comparisons`. Composite foreign keys make it impossible for a cell to reference a competitor, criterion or source from another analysis, and a unique `(competitor, criterion)` pair gives one cell per intersection.
- **Research adapter (future):** `src/lib/competitors/research-adapter.ts` defines the server-side interface for automated website research and ships it **disabled**. It encodes the rules a real adapter must follow: no unrestricted scraping, `validateResearchUrl` (SSRF guard) and `isAllowedByRobots` (robots.txt) must pass first, every finding records source URL and retrieval date, verified facts and AI interpretation are different types, and pricing or features are never invented.

### Known limitations (Phase 3)

- No AI generation and no automated website research yet; both are interfaces only.
- Matrix cells are edited one at a time in a panel under the table, not inline or with spreadsheet paste.
- Competitors and criteria are reordered with up/down buttons, not drag and drop.
- Comparison supports four personas at a time. Two tabs editing the same item: last save wins.
- PDF uses Helvetica, so characters outside Latin text print as `?`. A very wide matrix (many competitors) gets narrow columns in PDF and Word.

## Research Synthesizer and Journey Mapper (Phase 4)

### Research Synthesizer

A synthesis is a workspace with four tabs: **Research material**, **Affinity board**, **Insights** and **Report**. It works fully by hand; nothing is generated and nothing is sent to an AI service.

- **Material:** add a statement, paste notes, or upload a text file. Pasted notes and files are *reviewed first*: you see how they were split, remove statements you don't want, and confirm. Nothing is saved before that. Each observation is a card with a participant code, source, kind (observation, quote, survey response, note) and tags.
- **Files:** `.txt`, `.md`, `.csv` and `.tsv`, up to 1 MB and 500 statements per import (statements up to 2,000 characters; up to 2,000 observations per synthesis). The file is read **in the browser and never uploaded or stored**; only the confirmed text is saved, plus the file's name and size for reference. CSV and TSV files let you pick the column to import. Limits are checked in the browser before reading and again on the server.
- **Affinity board:** themes are columns beside "Not grouped yet". Drag a card by its handle (pointer or keyboard: Space, arrows, Space), or use each card's "Move to" menu. Rename themes, add notes, reorder and delete them (deleting ungroups cards, never deletes evidence). Zoom 60–150%, drag empty space to pan. **Undo and redo** (buttons, Ctrl/⌘+Z) cover board changes: moving cards, and creating, renaming, reordering and deleting themes. Adding or deleting an observation is not undoable. The board autosaves as one transaction (`save_affinity_layout`).
- **Insights:** observation, evidence, theme, pattern, user need, problem or opportunity, insight statement, confidence and recommended action. Each is marked as a *direct observation*, *research interpretation*, *hypothesis* or *recommendation*. **At least one piece of evidence is required**, enforced on the server. Deleting evidence leaves the insight in place, flagged "No evidence linked".
- **Report:** overview, methodology, participants, key themes, supporting observations, insights, user needs, pain points, recommendations and limitations. You write the overview, methodology, participant, pain point, recommendation and limitation text; everything else is built from your work, with observations numbered O1, O2... and cited from insights. Export to PDF, Word and Markdown (`GET /api/syntheses/[id]/export?format=md|pdf|docx`, authenticated, rate limited, 404 for syntheses you don't own).
- **AI readiness:** `src/lib/ai/synthesis-ai.ts` is disabled. It states the rules for a future provider: suggestions only, evidence is never invented, and the research-notes sharing warning must be shown and agreed to before anything leaves Yedara.

### Journey Mapper

- **Journeys** belong to a project and optionally one of its personas, with a name, type (customer, user, service, employee), scenario and *current* or *future* state. Copy a journey, or copy it as a future-state journey, with its stages and items (`duplicate_journey`).
- **Stages** can be added (with optional suggestions), renamed, reordered and deleted. Each has an emotion (1 very negative to 5 very positive, or *not rated*) and a note, and holds user actions, goals, thoughts, touchpoints, channels, pain points, opportunities and supporting evidence.
- **Views:** a **visual map** (stages left to right, readable column widths, scrolls sideways inside its own frame, optional emotion curve that breaks at unrated stages rather than reading them as neutral), a **structured table**, and a **presentation** (overview then one slide per stage, arrow keys, optional full screen). The open view is kept in the address.
- **Evidence:** pain points, opportunities and evidence items take a note and can link to an observation from a synthesis. You can only link observations you own (enforced by RLS).
- **Opportunities:** "Add to opportunities" on a pain point or opportunity creates a record for the future Opportunity Analyzer, keeping the journey and stage names (copied, so they survive renames and deletions), the evidence note and the linked observation. Each item can be handed on once.

### Data and security

New tables: `research_syntheses`, `research_sources`, `research_observations`, `research_themes`, `affinity_boards`, `affinity_cards`, `research_insights`, `research_insight_evidence` (the join that makes evidence traceable), `journeys`, `journey_stages`, `journey_items` and `opportunity_candidates`. Every child row carries its parent id, composite foreign keys keep sources, cards, themes, evidence and stages inside their own synthesis or journey, and RLS is owner-only with parent ownership checked on every child row. Nothing is publicly readable. Research notes can contain personal information, so the app keeps them in your account only, tells you to use participant codes, and stores no uploaded files. Deleting a source (keeping or deleting its observations), an observation, an insight, a synthesis or a journey is always a confirmed, explicit action.

### Known limitations (Phase 4)

- Only plain-text files are supported (no PDF or Word import), and one file is imported at a time.
- Board undo and redo reset when you leave the page. Two tabs editing the same synthesis or journey: last save wins.
- The board is a column layout (themes side by side), not a free canvas, and touch dragging on phones is better done with each card's "Move to" menu.
- Journey stages and items are reordered with buttons (stages) or by creation order (items), not drag and drop.
- There is no journey export yet; use the presentation view or print the page.

## Design system

The app and landing page share the "Working Ledger" tokens from Doxa's `DESIGN.md`: warm white and Oat grounds, parchment hairlines, warm ink, and a single terracotta accent, in Manrope throughout. Tokens live in `src/app/globals.css` (light and dark); components must use the semantic names (`bg-primary`, `text-primary-text`, `bg-muted`, `border-border`) and never raw hex.

- **Themes:** Light / Dark / System via the sun/moon menu in every header. The saved choice is applied before first paint.
- **Rules applied:** one filled primary per view; the accent as text is always `primary-text`; hovers are Oat washes; the sidebar marks the current page with a quiet wash, never an accent tint; sentence-case labels; tabular numerals for counts; flat at rest (only menus, dialogs and the drawer cast a shadow); 36px controls at 6px radius, 16px cards.
- **Guarded by tests:** `tests/unit/design-tokens.test.ts` checks WCAG AA contrast for every text/background pair in both themes, light/dark token parity, and that components contain no hard-coded hex.
- **Not applied:** Doxa's board-specific patterns (data-grid tables, vote chip, `?item=` drawer, roadmap) and its photographic auth panel, since they belong to that product's features.
