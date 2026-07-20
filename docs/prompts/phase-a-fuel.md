# Phase A — Fuel: facts corpus + master resume

Copy everything below into a Claude Code session (Sonnet is fine).

---

You are executing Phase A of `docs/EXECUTION_PLAN.md` in the CareerOS repo. Goal: create the
verified-facts corpus and master resume that every downstream module needs. Read
`docs/EXECUTION_PLAN.md` and `lib/fact-import.ts` before starting.

Standing rules: never invent facts, metrics, dates, or employers — everything comes from my answers
verbatim (light cleanup only). Gaps are first-class data, not things to hide. All imported facts land
as `status='proposed'` unless the source line carries a `[verified: YYYY-MM-DD]` marker; only I
verify, in the Fact Inbox. Re-check DB counts before bulk writes — other sessions share this DB.

## Step 1 — Interview me (conversational, one topic at a time)

Ask, wait for my answer, ask focused follow-ups to quantify (numbers, dates, team sizes,
how measured) before moving on:

1. Career spine: each role ~last 10 years — employer, title, dates, scope, team size.
2. Top 5–8 resume-grade outcomes with real numbers and how each was measured.
3. AI-native evidence: what I've actually shipped or led involving LLMs/agents.
4. The consulting-to-PM / deployment-hybrid story in my own words.
5. Honest gaps: what JDs ask for that I don't have.

## Step 2 — Write `docs/marc-facts.md`

Structure: one section per role, categories within (Scope / Methods used / Outcomes /
Artifacts-frameworks / Tradeoffs-judgment calls), plus Cross-Cutting Facts and Explicit Gaps
sections. One bullet = one atomic fact. Append `[verified: <today>]` ONLY to facts I explicitly
confirmed in this session. Show me the file for review before Step 3.

## Step 3 — Import to the `facts` table

Use the facts-migrator subagent (`.claude/agents/facts-migrator.md`) or follow its rules directly:
one bullet → one row, category mapping per that file, `source='seed'`, marker-parsing per
`lib/fact-import.ts` (`extractVerifiedDate`). Dedupe against existing fact bodies before insert.
Report: inserted verified / inserted proposed / skipped duplicates.

## Step 4 — [MARC] Hand back to me

Tell me to: (a) review proposed facts at `/inbox` (verify / edit / reject), and (b) paste my
master resume at `/resumes` (it must save with `master=true`). Stop there.

## Exit criteria (verify with SQL and report)

- `facts` has verified rows including at least one `category='gap'`
- a `resumes` row with `master=true` exists
- zero `status='proposed'` facts left in the Inbox
