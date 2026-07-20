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

## Lessons from prior runs (read before starting)

- **Never `Read` raw ATS JSON or full job-description text into the transcript.** Process boards via
  small node/bash scripts that print only counts and short summaries. A prior run blew through a lot
  of context by reading one uninspected chunk of a JSON file straight into the conversation — always
  fetch to a tmpfile and only pull out the specific fields needed, truncated, never the whole payload.
- **Batch tool calls.** Build one combined script per run (fetch + parse + filter + prepare inserts)
  instead of many sequential small `Bash`/`curl` invocations — each extra call is a permission prompt
  for Marc, and this was explicit feedback from a prior run.
- **Honesty over count.** If Marc (or a research task) asks for N companies/roles matching strict
  criteria, report the true count found and say what was dropped and why — never pad with weaker
  matches to hit N. This is also Marc's own rule in `job-hunter.md` ("5+ roles is a target, not a
  requirement... padding is worse than an honest short list") — treat it as load-bearing here too.

## Steps

1. **Load target companies.** Query:
   ```sql
   select id, owner_id, name, ats_type, ats_slug, ats_last_status, notes
   from companies
   where ats_slug is not null and ats_type is not null;
   ```
   via `mcp__supabase__execute_sql`. `ats_type` is `greenhouse` | `ashby` | `lever` | `workday` |
   `custom` — not every big-tech/enterprise company runs a Greenhouse/Ashby/Lever board, so don't
   filter the target list down to those three. Companies with `ats_type` null and
   `ats_last_status` starting with `unsupported:` have no known public JSON endpoint yet (JS-rendered
   or bot-protected career site) — skip them but don't drop them from `companies`; a future pass with
   different tooling (e.g. a headless browser) may unlock them.

2. **Fetch each board.** Reuse the exact endpoint shapes already implemented in
   `lib/ats/greenhouse.ts`, `lib/ats/ashby.ts`, `lib/ats/lever.ts` (don't reimplement parsing logic —
   read those files if unsure of a field name) for the three native ATS types:
   - Greenhouse: `GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`
   - Ashby: `GET https://api.ashbyhq.com/posting-api/job-board/{slug}`
   - Lever: `GET https://api.lever.co/v0/postings/{slug}?mode=json`

   For `ats_type = 'workday'` or `'custom'` companies, the specific endpoint isn't a fixed shape —
   read `companies.notes` for the resolved endpoint recorded during recon (format: a one-line
   description plus the literal request URL). Known-working patterns discovered so far, reusable
   as-is for the tenants already recorded (Adobe, Salesforce, Workday-the-company on Workday;
   Amazon, Netflix, Oracle as custom):
   - **Workday** (`ats_type = 'workday'`, `ats_slug` = tenant): `POST
     https://{tenant}.{dc}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` with JSON body
     `{"appliedFacets":{},"limit":20,"offset":N,"searchText":"product manager"}` (`limit` caps at 20;
     paginate via `offset`; `{dc}` and `{site}` are tenant-specific and were resolved once during
     recon — read them from `notes`, don't re-guess). To onboard a *new* Workday tenant, resolve
     `{dc}`/`{site}` by web-searching `"<company> careers myworkdayjobs.com"` or probing common `wd1`
     `wd5` `wd12` datacenters with common site names (`Careers`, `External_Career_Site`,
     `ExternalCareerSite`) before giving up on a company as unsupported — a 422 means the tenant
     exists but the site name/body is wrong, not that Workday isn't in use.
   - **Amazon** (custom): `GET https://www.amazon.jobs/en/search.json?base_query={query}&offset=N&result_limit=100`.
   - **Netflix** (custom, Eightfold-powered): `GET
     https://explore.jobs.netflix.net/api/apply/v2/jobs?domain=netflix.com&query={query}&start=N&num=10`
     (page size is capped at 10 regardless of `num`; paginate via `start`).
   - **Oracle** (custom, Oracle Fusion Recruiting Cloud): `GET
     https://eeho.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions
     ?onlyData=true&expand=requisitionList.secondaryLocations
     &finder=findReqs;siteNumber=CX_1,facetsList=LOCATIONS,limit=50,offset=N,keyword={query},sortBy=POSTING_DATES_DESC`.

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

3a. **Resolve ambiguous multi-location postings before applying the location filter — don't just
   drop them.** Workday search results summarize multi-site postings as a bare count (`"3 Locations"`,
   `"8 Locations"`) instead of listing them; a posting whose real location list includes NYC or Remote
   would otherwise be silently excluded by the location filter. If a posting already passes the title
   relevance check (step 3) and its `locationsText` matches `/^\d+ Locations$/`, resolve the real list
   before deciding to drop it:
   ```
   GET https://{tenant}.{dc}.myworkdayjobs.com/wday/cxs/{tenant}/{site}{externalPath}
   ```
   (`externalPath` is the value from the search result, e.g. `/job/San-Jose/Product-Manager_R168808`;
   append it directly to the tenant/site base — no extra `/job` segment). The response's
   `jobPostingInfo.location` (primary) plus `jobPostingInfo.additionalLocations` (array) together give
   the full location list — apply the same NYC-or-Remote check against all of them. This is a real
   HTTP call per ambiguous posting (not free), so only do it for postings that already cleared the
   title-relevance filter, not the full unfiltered result set. When a match is found this way, record
   in the `rationale` that the location was resolved from an aggregated summary and list the full
   location set, so Marc can see why a posting whose primary/first-listed location isn't NYC or Remote
   still made the cut (e.g. `"San Jose, New York, San Francisco"` matched on `"New York"`). Treat a
   `"Remote {State}"` tag (e.g. `"Remote California"`) as a location-restricted remote designation, not
   unconditional remote — flag it explicitly rather than silently treating it as satisfying a
   `remote_preferred`/`nyc_or_remote` policy for someone outside that state.

3b. **Gate on hard deal-breaker domains before scoring.** Pull `calibrations.excluded_domains` (e.g.
   `{gambling,defense}`) for the calibration in use, and drop any posting whose `jd_text` matches
   those domains — same behavior as `lib/ats/dealbreaker.ts`'s `isExcludedByDealbreaker`. These
   postings never reach the scoring step at all; they're not inserted, not scored, not shown.

4. **Skip already-known jobs.** Before inserting, check `select url from jobs where owner_id = $owner`
   — never insert a `url` that's already present (mirrors the `uq_jobs_owner_url` unique index the
   v1 route relies on for its upsert-ignore).

5. **Score each new posting inline.** For every posting not already in `jobs`:
   - Pull the rubric: `select body from playbooks where slug = 'job-hunter'`. If empty (playbooks
     haven't been imported yet), fall back to the same minimal rubric text hardcoded in
     `lib/scoring.ts` ("Score each dimension from 0 to 100 based only on the posting and verified
     facts. Explain uncertainty; never invent experience or compensation.").
   - Pull the calibration to use: ask Marc which `calibrations.id` to score against if more than one
     exists, or use the only one present. Never silently invent calibration dials. Pass through the
     full row — `total_comp_floor`, `base_floor`, `brand_weight`, `exit_weight`, `location_policy`,
     and `comp_structure_note` — into the scoring reasoning. Note the comp-structure nuance
     explicitly: total comp clearing the floor is not sufficient on its own — a base+bonus-only
     structure at the same total comp as an equity/RSU-heavy offer should score lower on `comp_fit`,
     per `comp_structure_note`.
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

## Cadence

Default target is **2x/day** (e.g. ~8am and ~6pm ET) so a fresh posting has a real shot at being
triaged inside Marc's 24-hour apply-window goal (see `lib/freshness.ts` — jobs are tiered
hot/warm/cooling/stale by hours since `scanned_at`). Marc controls actual timing wherever this skill
is invoked from (a `/schedule` routine or his own recurring process) — this skill has no built-in
schedule of its own.

## What this skill does NOT do

- Does not run unattended — it's invoked manually in a Claude Code session (or later via
  `/schedule`, if Marc sets that up separately).
- Does not touch `sessions`/`model_costs` — there's no per-token spend to reconcile against the
  <$30/mo target.
- Does not promote any company out of `tier='watch'` — that stays a manual decision on the
  Companies page, same truth-discipline rule as the funding scanner.
