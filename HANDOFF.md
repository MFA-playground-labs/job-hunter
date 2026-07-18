# CareerOS — Build Handoff

Task list + context for completing the build. The foundation (schema, types, auth,
LLM/retrieval libs, config) is **done**; the app surface (routes + pages) and the
scanner are **not built yet**. Work through the Remaining Tasks in order — each is
independently shippable.

## 1. What this is

CareerOS: a single-user, AI-native job hunt OS for Marc Agosin (Senior Lead PM →
AI-native PM / Director roles). Core idea: a **verified-facts corpus** every module
reads from and writes back to, plus a job/funding **scanner**. Full product spec was
provided as the "PART 1 — BUILD PROMPT" (13-table data model, 5 modules, model
routing table, 5 build phases).

**Approved scope for this effort: Phase 1 (corpus + pipeline) AND Phase 2 (scanner).**
Phases 3–5 (resume studio/interviewer, coach, Obsidian webhook sync, loop dashboards)
are later — but their tables already exist in the schema so no churn later.

### Decisions already made (do not relitigate)

- **Schema replaced wholesale** — old Phase-1 schema (roles/resume_versions/interactions)
  deleted; no live data existed. New migration is the source of truth.
- **Embeddings deferred** — vector columns exist (dimensionless `extensions.vector`),
  but no provider is active. `lib/retrieval.ts` uses keyword/category/recency ranking.
  Do NOT add a vector index or provider now.
- **Anthropic Batch API deferred** — sync calls with prompt caching (volume is tiny;
  costs are logged to prove <$30/mo). `lib/llm.ts` is the only place LLM calls happen.
- **Model routing** (already encoded in `lib/llm.ts` `TASK_ROUTING`):
  Haiku `claude-haiku-4-5` for extraction/scoring/parsing; Sonnet `claude-sonnet-5`
  for tailoring/interviewer/coach/fit-eval; Opus `claude-opus-4-8` for teardown/offer
  decisions (Phase 3+).
- **Subagents**: the old `.claude/agents/` roster is stale (old schema) — delete it and
  write a new roster near the end (task 10).

### Truth-discipline rules (hard, from the spec — enforce everywhere)

- Every job row links to a real posting URL; scan dates displayed; scans >14 days old
  are **stale** — displayed as such, excluded from the digest, never "refreshed".
- Comp figures are labeled estimates (`comp_is_estimate`).
- **Nothing auto-commits to `facts`**: all LLM output lands as `status='proposed'`;
  only Marc verifies (Fact Inbox). Companies are never silently added to the target
  list — funding-scan proposals enter as `tier='watch'` and Marc promotes.
- Never fabricate postings, metrics, or experience. Gaps (category `gap`) are
  first-class data.

## 2. Environment constraints

- **Next.js 16.2.10** (not 15): Turbopack default, async-only `cookies()`/`params`/
  `searchParams`, `proxy.ts` replaces middleware (already written), `next lint`
  removed. Per `AGENTS.md`: **read the bundled docs in `node_modules/next/dist/docs/`
  before writing unfamiliar surfaces** — training-data conventions may be wrong.
- **No Docker** → local Supabase can't run. Verify via `npx tsc --noEmit`,
  `npm run build`, vitest, and `npm run dev` smoke (pages must render a
  "Supabase isn't connected" state when env vars are absent — see
  `components/setup-needed.tsx` and the guard pattern in `lib/api.ts`).
- Tailwind 4 + shadcn/ui (on `@base-ui/react`) — reuse `components/ui/*`,
  `components/nav.tsx`, `components/empty-state.tsx`, `components/setup-needed.tsx`.
- Single user: signup disabled (`supabase/config.toml`), login at `app/login/page.tsx`,
  session refresh + route gating in `proxy.ts` (cron routes excluded from matcher).
- `marc-facts.md` and the master resume are **not in the repo yet**. Importers must
  no-op with a clear message until Marc drops them in `docs/`.

## 3. Already done (don't redo)

| Area | Files |
|---|---|
| Schema: 13 tables, CHECKs, indexes, updated_at triggers, RLS (`owner_id = auth.uid()` on everything), pgvector ext | `supabase/migrations/20260718120000_careeros_schema.sql` |
| Hand-written DB types mirroring `supabase gen types` shape + `ModelCostEntry`/`OutcomeEvent` | `types/database.ts` |
| Auth: login page, proxy session-refresh + redirect, signup off | `app/login/page.tsx`, `proxy.ts`, `supabase/config.toml` |
| LLM client: `runLLM({task, system, messages, jsonSchema?})` — routing table, prompt caching (`cache_control` on system), structured outputs (`output_config.format`), per-call cost computation; `createSession`/`appendSessionCosts` write `sessions.model_costs` | `lib/llm.ts` |
| Embeddings null-provider (off by default, throws if `EMBEDDINGS_PROVIDER` set) | `lib/embeddings.ts` |
| Fact retrieval: keyword-overlap + recency ranking over verified facts, gaps always included; `formatFactsBlock` | `lib/retrieval.ts` |
| Playbook file map (8 playbooks in `Obsidian 2nd brain/Interview prep MDs/`) + loader + sha256 `contentHash` | `lib/playbooks.ts` |
| marc-facts import helpers: `[verified: date]` marker parsing, extraction JSON schema, validation, system prompt | `lib/fact-import.ts` |
| API guards: `requireUser()` (cookie auth + Supabase-configured check), `requireCronSecret(request)` | `lib/api.ts` |
| Config: env example, Vercel crons (daily scan-jobs, weekly scan-funding), `outputFileTracingIncludes` so repo markdown ships in serverless bundles | `.env.local.example`, `vercel.json`, `next.config.ts` |
| Supabase server/browser clients (typed with `Database`) | `lib/supabase/*` |

Deleted (intentionally): old migrations + seed, `types/database.ts` (old), `lib/{anthropic,dashboard,pipeline-types,stages}.ts`, `app/api/{tailor,teardown,interview}`, `app/{pipeline,roles,resume-workspace}`.

**Note:** `app/dashboard/page.tsx`, `app/page.tsx`, and `components/nav.tsx` still
reference deleted modules/old tables — they will not typecheck until rebuilt
(tasks 4–5). That's the expected starting state.

## 4. Remaining tasks (in order)

### Task 1 — Admin import routes
- `app/api/admin/import-playbooks/route.ts` (POST): `requireUser()` → `loadPlaybookFiles()`
  → upsert into `playbooks` keyed on `slug` (`uq_playbooks_owner_slug` exists; skip rows
  whose `content_hash` is unchanged). Return `{imported, skipped, missing}`.
- `app/api/admin/import-facts/route.ts` (POST): `requireUser()` → read
  `docs/marc-facts.md` (fs, `process.cwd()`); if absent return 404-style JSON telling
  Marc to drop the file in `docs/`. Else: `createSession(supabase, "fact_import")`,
  call `runLLM({task: "fact_extraction", system: FACT_EXTRACTION_SYSTEM, jsonSchema:
  FACT_EXTRACTION_SCHEMA, ...})` with the file content; validate items with
  `isExtractedFact`; run `extractVerifiedDate` on each body — marked → insert
  `status='verified'` + `verified_at`, unmarked → `status='proposed'`; `source='seed'`.
  Dedupe against existing fact bodies (exact match) before insert.
  `appendSessionCosts` at the end. Long file: chunk by markdown headings if >100KB.

### Task 2 — Fact Inbox + facts browser + export
- `app/inbox/page.tsx`: card list of `status='proposed'` facts. Actions (server
  actions in `app/inbox/actions.ts`): **verify** (→ `status='verified'`,
  `verified_at=now()`), **edit-then-verify** (update body/category/role_context then
  verify), **reject** (→ `status='retired'`). Mobile-responsive (spec NFR) — cards
  stack, buttons thumb-reachable.
- Correction flow (used from facts browser): create the corrected fact as a new row
  (`status='proposed'`), insert `fact_corrections` (old_fact_id, new_fact_id, reason),
  set old fact `status='corrected'`.
- `app/facts/page.tsx`: table/list of all facts, filters (role_context, category,
  status) via `searchParams` (async in Next 16). Surface gaps prominently (own
  section). Link to export.
- `app/api/export/facts/route.ts` (GET): `requireUser()` → markdown of the corpus
  grouped by role_context/category, `[verified: date]` markers re-emitted;
  `Content-Disposition: attachment`. Same idea for resumes:
  `app/api/export/resumes/route.ts`.

### Task 3 — Tracker CRUD pages
All server components + server actions; reuse `Card`, `Table`, `Badge`, `Select`,
`Dialog`, `Input`, `Textarea` from `components/ui`. Guard every page with the
`isSupabaseConfigured()` → `<SetupNeeded/>` pattern and redirect handled by proxy.
- `app/companies/page.tsx`: list grouped by tier (`target_1`, `target_2`, `broad`,
  `watch`); add/edit company (name, ats_type, ats_slug, tier, notes); **watch-tier
  approval queue** at top: watch companies with `fit_rationale` shown as cards →
  "Promote to target_1/2/broad" or "Dismiss" (delete or keep watch). Show
  `ats_last_status` (e.g. slug 404s from scans).
- `app/jobs/[id]/page.tsx`: job detail — title, company, **real posting URL**,
  location, comp (+ "estimate" badge when `comp_is_estimate`), `scanned_at` +
  stale badge (>14 days), JD text, latest `job_scores` row with all four component
  scores + rationale + calibration label + model. Status transitions + pass-reason
  capture (see Task 5).
- `app/pipeline/page.tsx`: kanban over `jobs.status` (columns: interested → applied →
  interviewing → offer; rejected/closed collapsed). Applications: creating one links
  job + resume + `applied_at`; outcome events appended to `applications.outcome_events`
  (`OutcomeEvent` type) via a small timeline UI on the job detail page.
- `app/outreach/page.tsx`: table of outreach rows (contact, company, channel, status,
  last_touch, next_follow_up, notes) with inline add/edit; overdue follow-ups
  highlighted. This is Marc's priority — keep it simple but working.
- `app/resumes/page.tsx`: paste/store master resume (`master=true`, unique partial
  index exists — upsert accordingly, versioning via `derived_from` later), view +
  markdown export link.

### Task 4 — Dashboard (`app/dashboard/page.tsx`, rebuild)
Tiles: pipeline counts by status; facts corpus size (verified vs proposed — link to
inbox); new jobs today; stale-scan warning count; companies with zero open relevant
roles (outreach signal, links to outreach); **monthly LLM spend widget** — sum
`cost_usd` from `sessions.model_costs` for the current month, grouped by model
(target <$30/mo). Rebuild `components/nav.tsx` links: Dashboard, Jobs, Pipeline,
Companies, Outreach, Inbox, Facts, Resumes, Settings + sign-out button.
`app/page.tsx` → redirect to `/dashboard`.

### Task 5 — Scanner: ATS fetchers + scan runner + scoring + digest
- `lib/ats/types.ts`: `NormalizedPosting {title, url, location, jd_text, source}`.
- `lib/ats/greenhouse.ts` / `ashby.ts` / `lever.ts`: fetch + parse the public APIs:
  - GH: `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`
  - Ashby: `https://api.ashbyhq.com/posting-api/job-board/{slug}`
  - Lever: `https://api.lever.co/v0/postings/{slug}?mode=json`
  Pure parse functions (JSON in → postings out) separated from fetch so they're
  fixture-testable. 404 → return `{status: 'not_found'}` so scan can set
  `companies.ats_last_status`.
- `lib/ats/filter.ts`: `isRelevantTitle(title)` — PM/product/strategy titles
  (product manager, product lead, director of product, head of product, principal pm,
  group pm, product strategy, chief of staff±product, etc.; exclude marketing/project
  manager false positives). Dedupe by URL (DB unique index `uq_jobs_owner_url` +
  upsert ignore).
- `lib/scoring.ts`: `scoreJob(job, calibration, facts)` → one `runLLM({task:
  "job_scoring", jsonSchema})` call returning `{comp_fit, brand, exit_opportunity,
  role_content_fit, composite, rationale}` (0–100 or 1–10, pick one and document).
  System prompt: the `job-hunter` playbook body from the `playbooks` table (fall back
  to a minimal built-in rubric if not imported yet) + calibration dials serialized +
  `formatFactsBlock(retrieveFacts(...))`. Store to `job_scores` with `calibration_id`
  and `model`.
- `app/api/cron/scan-jobs/route.ts` (GET or POST): `requireCronSecret` OR an
  authenticated user (support both — the UI "Scan now" button calls it with cookies).
  Flow: load companies with `ats_slug`; fetch each board; filter titles; upsert new
  jobs (`status='new'`, `scanned_at=now()`, `source=<ats_type>`); update
  `companies.ats_last_status`; score new jobs against the **explicitly provided**
  `calibration_id` (body param — dials are never silently reused; the UI must pass
  one); create `sessions` row `type='job_scan'` with costs + summary. Companies whose
  board returned zero relevant roles → include in response as the zero-openings
  signal. NOTE: cron invocations have no calibration — use the most recent
  calibration but flag `calibration_reused: true` in the session summary, and have
  the digest UI surface that ("scores used calibration X from <date> — confirm or
  create new dials"). Set `export const maxDuration = 300` if needed.
- **Digest** (`app/jobs/page.tsx`, default view): new jobs ranked by composite desc,
  score chips per component, rationale expandable, scan date; actions per row:
  **Interested** (→ `status='interested'`) / **Pass** (dialog: reason enum
  comp_too_low | brand_mismatch | wrong_scope | location | domain | other + optional
  note → `status='passed'`, `pass_reason`, `pass_note`). Pass reasons are training
  data — never discard. Stale (>14d) and passed jobs live under a secondary tab/list.
  Zero-openings companies section → one-tap "Create outreach entry" (insert into
  `outreach` with `status='suggested'`, note "target company, no open PM roles").
  "Scan now" client button → POST the cron route (include selected/confirmed
  calibration), toast results.
- Calibration editor in Settings (Task 7): CRUD `calibrations` (label,
  total_comp_floor, base_floor, brand_weight, exit_weight).

### Task 6 — Funding scan
- `lib/rss.ts`: tiny RSS/Atom parser (no new deps — regex/`DOMParser`-free string
  parsing is fine, or use a minimal hand parser; fixture-test it). Sources:
  TechCrunch funding tag feed (`https://techcrunch.com/tag/funding/feed/`), Fortune
  Term Sheet, Axios Pro Rata (public feeds; if a feed 404s record and continue).
- `app/api/cron/scan-funding/route.ts`: `requireCronSecret` or user. Pipeline:
  fetch feeds → `runLLM({task: "funding_extraction", jsonSchema})` per batch of items
  → filter Series A–D in AI / fintech-embedded / web3 / vertical SaaS → dedupe
  (unique index `uq_funding_events_dedupe` on owner+company_name+source_url) →
  insert `funding_events`. Then fit evaluation: for events with `fit_evaluated=false`,
  `runLLM({task: "funded_company_fit"})` against the facts corpus ("does this company
  hire Marc's archetype: AI-native PM, consulting-to-PM, deployment-hybrid like
  Sierra/Decagon?") → high-fit companies upserted into `companies` as `tier='watch'`,
  `source='funding_scan'`, `fit_rationale` set — **never** directly to target tiers.
  Mark events `fit_evaluated=true`, set `relevance_score`. Log costs to a
  `funding_scan` session.
- ATS slug autodetect for watch companies without a slug: try obvious variants
  (lowercased name, hyphenated, concatenated) against all three board APIs; on hit
  set `ats_slug`/`ats_type`. Cap attempts (~6 per company per scan).

### Task 7 — Settings page (`app/settings/page.tsx`)
Sections: Playbooks (list from DB with title/slug/updated_at, view/edit body in a
dialog or subpage, "Import playbooks from repo" button → Task 1 route); Fact import
("Import marc-facts.md" button + status message when file missing); Calibrations
CRUD; Spend detail (per-session cost table, current month total).

### Task 8 — Starter company seed (`supabase/seed.sql`)
~15–20 **real** AI-native companies with publicly known ATS boards as `tier='watch'`,
`source='seed'` so the first scan yields opportunities immediately. Include e.g.:
Anthropic (greenhouse: `anthropic`), OpenAI (ashby: `openai`), Sierra (ashby:
`sierra`), Decagon, Harvey, Ramp (ashby: `ramp`), Scale AI, Perplexity, Glean,
Cursor/Anysphere, Vercel, Linear, Notion, Retool, Mercury, Brex (verify each slug
shape — the first scan validates and records 404s in `ats_last_status`; that's the
designed recovery path, so best-effort slugs are acceptable, invented companies are
not). Same `do $$` + `dev_owner_id` pattern as the old seed (see git history:
`git show e198dc9:supabase/seed.sql`) — seed requires a real auth user id.

### Task 9 — Tests (vitest)
`npm i -D vitest` + `"test": "vitest run"` script. No network in tests; fixtures in
`tests/fixtures/*.json`. Cover: greenhouse/ashby/lever parsers (one fixture each,
including a 404/error shape), `isRelevantTitle` (positives + marketing/project-manager
negatives), URL dedupe, staleness rule (>14 days), `extractVerifiedDate` (ISO date,
prose date, no marker, marker mid-sentence), `rankFactsByKeywords` (ranking +
recency tie-break), `computeCostUsd` (cache read/write math), RSS parser fixture.

### Task 10 — Docs + agent roster
- Rewrite `README.md`: what CareerOS is, current build status, getting started
  (hosted Supabase: `supabase link` + `supabase db push`, create the single user in
  Studio, `.env.local`, Vercel env vars + crons), what to drop in `docs/`
  (marc-facts.md, master resume).
- Update `docs/README.md` for the new drop-in expectations.
- Delete the five old files in `.claude/agents/` (old schema). Write a new roster
  encoding this build's conventions: e.g. `careeros-db.md` (migration/RLS/types
  conventions, hand-written types rule), `careeros-llm.md` (all calls via
  `lib/llm.ts`, routing table, proposal→approval invariant, cost logging),
  `careeros-ui.md` (shadcn patterns, setup-needed guard, server actions, mobile
  NFRs), plus an updated `code-reviewer.md` aware of the truth-discipline rules.

### Task 11 — Verification (run after each task, full pass at the end)
1. `npx tsc --noEmit` and `npm run build` pass.
2. `npx vitest run` green.
3. `npm run dev` smoke: `/login` renders; without env vars every page shows the
   setup state; nav links resolve.
4. `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/scan-jobs`
   degrades gracefully without Supabase/Anthropic keys (5xx JSON, no crash).
5. Full E2E needs Marc: hosted Supabase linked (`supabase db push`), auth user
   created, keys in `.env.local` → login, import playbooks, seed/approve companies,
   Scan now, digest triage, Fact Inbox, spend widget.

## 5. Conventions

- **All LLM calls go through `runLLM()`** (`lib/llm.ts`). Never instantiate the
  Anthropic SDK elsewhere. Never pass `temperature`/`top_p` (rejected on Sonnet 5).
  Use `jsonSchema` (structured outputs) for anything parsed — schemas need
  `additionalProperties: false` on every object and no numeric min/max constraints.
  Log every call's cost via `createSession`/`appendSessionCosts`.
- **All fact retrieval goes through `retrieveFacts()`** (`lib/retrieval.ts`).
- Mutations: prefer server actions for page-local writes; API routes for cron/import/
  export. Always the `requireUser()` / `requireCronSecret()` guards from `lib/api.ts`.
- `owner_id` is set by column default (`auth.uid()`) — never pass it from app code;
  RLS scopes all reads.
- Match existing code style (see `app/login/page.tsx`, old dashboard in git history):
  2-space, double quotes, named exports for components, `@/` imports.
- Comments: only for constraints code can't express (see existing lib files).

## 6. Open items for Marc (not blockers)

- Drop `docs/marc-facts.md` and master resume into `docs/`.
- Create/link hosted Supabase + Vercel projects; fill env vars; create the single
  auth user in Supabase Studio (signup is disabled).
- Set up Supabase/Vercel MCPs or a `SUPABASE_ACCESS_TOKEN` so the agent can drive
  E2E verification (`supabase db push`) in a follow-up session.
- Later: pick Voyage or OpenAI to switch embeddings on.
