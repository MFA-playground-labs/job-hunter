---
name: scan-jobs
description: Scan target companies' public ATS boards for relevant PM roles, score them against Marc's calibration and verified facts, and write proposals into Supabase — using in-session reasoning (Claude subscription) instead of the Anthropic API. Use when Marc asks to "scan for jobs", "run the scanner", or wants a fresh jobs digest without touching metered API spend.
---

# Job scanner (v2 — subscription-based)

This is the subscription-billed counterpart to `app/api/cron/scan-jobs/route.ts` (the v1, API-billed
cron route — untouched, still available as a fallback tagged at `v1-api-scanner`). This skill does
the identical scan → filter → score → propose pipeline, but the scoring reasoning happens inline in
this Claude Code session instead of via `runLLM`/the Anthropic SDK, and results are written straight
to Supabase through the connected `supabase` MCP server. No `sessions`/cost row is created since
there is no per-token API cost to log — this session's own transcript is the audit trail.

**Never fabricate a posting.** Every job this skill inserts must come from a real ATS response with
a real `url`. If a board 404s or errors, record that on the company and move on — do not invent a
role to fill the gap.

## Steps

1. **Load target companies.** Query:
   ```sql
   select id, owner_id, name, ats_type, ats_slug, ats_last_status
   from companies
   where ats_slug is not null and ats_type is not null;
   ```
   via `mcp__supabase__execute_sql`.

2. **Fetch each board.** Reuse the exact endpoint shapes already implemented in
   `lib/ats/greenhouse.ts`, `lib/ats/ashby.ts`, `lib/ats/lever.ts` (don't reimplement parsing logic —
   read those files if unsure of a field name):
   - Greenhouse: `GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`
   - Ashby: `GET https://api.ashbyhq.com/posting-api/job-board/{slug}`
   - Lever: `GET https://api.lever.co/v0/postings/{slug}?mode=json`

   Fetch with `curl -s -o <tmpfile> -w "%{http_code}"` (via Bash) to avoid dumping huge JSON payloads
   into the transcript; read the tmpfile only for the fields needed. A 404 means "not_found"; other
   non-2xx is "error"; either way update `companies.ats_last_status` for that company afterward.

3. **Normalize + filter.** Extract `{title, url, location, jd_text}` per the field mapping in the
   corresponding `lib/ats/*.ts` file. Keep only postings whose title matches PM/product/strategy
   patterns and not marketing/project/program-manager false positives — apply the exact same rule as
   `lib/ats/filter.ts`'s `isRelevantTitle` (PM patterns: product manager, product lead, director of
   product, head of product, principal/group PM, product strategy, chief-of-staff+product; excluded:
   marketing, project manager, program manager, product marketing). Dedupe by `url` within a board's
   results (same behavior as `dedupePostingsByUrl`).

4. **Skip already-known jobs.** Before inserting, check `select url from jobs where owner_id = $owner`
   — never insert a `url` that's already present (mirrors the `uq_jobs_owner_url` unique index the
   v1 route relies on for its upsert-ignore).

5. **Score each new posting inline.** For every posting not already in `jobs`:
   - Pull the rubric: `select body from playbooks where slug = 'job-hunter'`. If empty (playbooks
     haven't been imported yet), fall back to the same minimal rubric text hardcoded in
     `lib/scoring.ts` ("Score each dimension from 0 to 100 based only on the posting and verified
     facts. Explain uncertainty; never invent experience or compensation.").
   - Pull the calibration to use: ask Marc which `calibrations.id` to score against if more than one
     exists, or use the only one present. Never silently invent calibration dials.
   - Pull verified facts + gaps: `select body, category, role_context from facts where owner_id =
     $owner and status = 'verified'` plus `category = 'gap'` rows. If this returns nothing (facts
     corpus not imported yet), score anyway but say so explicitly in the rationale — e.g. "Scored
     with no verified facts corpus available; role-content-fit confidence is low" — never invent
     facts to compensate.
   - Reason through `comp_fit`, `brand`, `exit_opportunity`, `role_content_fit` (0–100 each) and a
     `composite` (0–100), plus a `rationale` string that explains the reasoning and flags any
     confidence caveats (missing facts, missing comp data, etc.) — same shape as
     `ScoreOutput` in `lib/scoring.ts`.

6. **Write results.**
   ```sql
   insert into jobs (owner_id, company_id, title, url, location, jd_text, source, scanned_at, status)
   values ($owner, $company_id, $title, $url, $location, $jd_text, $source, now(), 'new')
   returning id;

   insert into job_scores (owner_id, job_id, calibration_id, composite, comp_fit, brand,
     exit_opportunity, role_content_fit, rationale, model)
   values ($owner, $job_id, $calibration_id, $composite, $comp_fit, $brand, $exit_opportunity,
     $role_content_fit, $rationale, 'claude-code-subscription');

   update companies set ats_last_status = $status where id = $company_id;
   ```
   Use the real `owner_id` for the single Marc user (looked up once from `auth.users`, not
   hardcoded across sessions — verify it still matches before writing in a new project).

7. **Report a summary** at the end: companies scanned, new jobs found (with composite scores),
   companies with zero relevant postings (the "zero-openings" outreach signal — same as the v1
   route's `zeroOpenings` list), and any board errors/404s.

## What this skill does NOT do

- Does not run unattended — it's invoked manually in a Claude Code session (or later via
  `/schedule`, if Marc sets that up separately).
- Does not touch `sessions`/`model_costs` — there's no per-token spend to reconcile against the
  <$30/mo target.
- Does not promote any company out of `tier='watch'` — that stays a manual decision on the
  Companies page, same truth-discipline rule as the funding scanner.
