# Phase D — Automation & coverage (one-time builds)

Copy everything below into a Claude Code session (Sonnet is fine). Run once Phase B has momentum
(applications exist). Two independent builds — run separately if context gets long.

---

You are executing Phase D of `docs/EXECUTION_PLAN.md` in the CareerOS repo (Next.js 16 — read
`AGENTS.md` and the bundled Next docs before writing unfamiliar surfaces).

Standing rules: never fabricate postings; fixture-based tests only (no network in vitest); typecheck
(`node node_modules/typescript/bin/tsc --noEmit`) + `node node_modules/vitest/vitest.mjs run` must
pass, then a code-reviewer subagent pass, before any commit. Re-check DB counts before bulk writes.

## Build 1 — Scheduled scans (2x/day)

Goal: fresh postings triaged inside the 24h hot window (`lib/freshness.ts`) without manual scans.
1. Ask me which mechanism: `/schedule` cloud routine invoking the scan-jobs skill flow
   (subscription-billed, preferred) vs Vercel cron hitting `app/api/cron/scan-jobs/route.ts`
   (API-billed, needs `CRON_SECRET` + Anthropic/Supabase env vars in Vercel).
2. Set up the chosen one (~8am and ~6pm ET). For the cron path, verify the calibration-reuse flag
   is surfaced in the digest UI per the route's session summary.
3. Verify: show me evidence of the first scheduled run (new `scanned_at` timestamps or session row).

## Build 2 — Workday fetcher

Goal: big-tech targets (`ats_type='workday'`) visible to the scanner instead of hand-loaded.
1. Research the public Workday CxS endpoint shape (POST
   `https://{tenant}.wd{n}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs`, JSON body with
   limit/offset/searchText) using a general-purpose subagent; confirm against 2 real tenants from
   the `companies` table.
2. Implement `lib/ats/workday.ts` in the exact pattern of `lib/ats/greenhouse.ts`: pure parse
   function (JSON in → `NormalizedPosting[]` out) separate from fetch; 404/error → status result
   for `companies.ats_last_status`. Note: Workday `ats_slug` needs tenant+site — decide and
   document the slug format (e.g. `tenant/wd5/site`) in the file header.
3. Wire into `lib/ats/index.ts`, the cron route, and add the pattern to
   `.claude/skills/scan-jobs.md` step 2.
4. Fixture test in `tests/` (real captured response, trimmed; plus an error shape), extend
   `isRelevantTitle` coverage if new title formats appear.
5. Typecheck + tests + code-reviewer subagent → commit.

## Exit criteria — scans run without me; a `workday` company returns real postings end-to-end.
