---
name: tailor-resume
description: Tailor Marc's master resume to a specific job in the pipeline using only verified facts, writing the result as a new resumes row in Supabase — using in-session reasoning (Claude subscription) instead of the Anthropic API. Use when Marc says "tailor my resume for <job/company>", picks an Interested job to pursue, or asks for an application-ready resume version.
---

# Resume tailoring (subscription-based)

Sibling to `scan-jobs.md`: same skills-first pattern — reasoning happens inline in this Claude Code
session, results are written to Supabase via the `supabase` MCP server. No `sessions`/cost row is
created; the transcript is the audit trail.

## Truth discipline (hard rules)

- **Only verified facts.** Every claim in the tailored resume must trace to the master resume body
  or a `facts` row with `status='verified'`. Never invent metrics, titles, dates, scope, or
  employers. If the JD asks for something Marc doesn't have, the tailoring strategy is emphasis and
  adjacency — never fabrication. Gaps (`category='gap'`) are real constraints: work around them,
  don't paper over them.
- **Blocked without inputs.** If there is no `resumes` row with `master=true`, or the verified
  facts corpus is empty, stop and tell Marc what's missing (master resume → `/resumes` page;
  facts → fact-capture + Inbox verification). Do not tailor from thin air.
- **Never auto-commit facts.** If tailoring surfaces a claim Marc states in-session that isn't in
  the corpus yet, insert it as `status='proposed'` (source `'session'`) for Inbox review — use it
  in the resume only if Marc confirms it verbally in this session.

## Steps

1. **Load inputs** via `mcp__supabase__execute_sql` (batch the queries; don't dump full bodies into
   the transcript — select only what's needed):
   - Target job: `select j.id, j.title, j.url, j.location, j.jd_text, c.name from jobs j join companies c on c.id=j.company_id where j.id = $job_id` (or look up by company/title if Marc named it).
   - Latest score + rationale from `job_scores` (context on fit strengths/risks to lean into).
   - Master resume: `select id, body from resumes where master = true`.
   - Verified facts + gaps: `select body, category, role_context from facts where status='verified' or category='gap'`.
   - Playbook: `select body from playbooks where slug='resume-tailoring'` — if present, follow it;
     if absent, proceed with the built-in approach below and say so.

2. **Analyze the JD** (if `jd_text` is blurb-only, fetch the posting `url` for the full JD — to a
   tmpfile, extracting only requirements/responsibilities): extract must-have keywords, level
   signals, and the top 3 things this hiring manager is screening for.

3. **Tailor.** Rewrite summary/bullets to mirror JD language where facts genuinely support it;
   reorder experience emphasis; keep length and formatting of the master. Produce an
   `ats_keyword_report` JSON: `{matched: [...], missing_but_true: [...], missing_and_absent: [...]}`
   — `missing_and_absent` keywords are honestly not covered; never smuggle them in.

4. **Review with Marc** in-session: show a diff-style summary of what changed and why (not the
   whole resume unless asked). Apply his edits.

5. **Write the result:**
   ```sql
   insert into resumes (owner_id, master, target_job_id, label, body, derived_from, ats_keyword_report, created_by, model)
   values ($owner, false, $job_id, $label, $body, $master_resume_id, $report::jsonb, 'llm', 'claude-code-subscription')
   returning id;
   ```
   Label format: `"{Company} — {Title} — {YYYY-MM-DD}"`. If an `applications` row exists or is being
   created for this job, link this resume id on it.

6. **Report**: what was emphasized, what keywords remain honestly unmatched, and the export path
   (`GET /api/export/resumes` or the `/resumes` page).

## What this skill does NOT do

- Does not send or submit anything anywhere.
- Does not touch `sessions`/`model_costs`.
- Does not modify the master resume row — tailored versions are always new rows with
  `derived_from` set.
