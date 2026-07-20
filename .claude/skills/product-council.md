---
name: product-council
description: Run a multi-perspective review loop over CareerOS's current state (product manager, UX, engineering lead, architecture lead) to surface gaps and refine the roadmap. Each persona runs as an independent parallel subagent; rounds repeat until findings converge (diminishing new issues) or a round cap is hit. Use when Marc asks to "run the product council", "get a second opinion on the roadmap", "review the product from multiple angles", or wants a periodic health check beyond what careeros-orchestrator's phase-tracking covers.
---

# Product council

careeros-orchestrator answers "what's the next unblocked step in the plan." This skill answers a
different question: "is the plan itself still right, and what are we missing that a single-lens pass
wouldn't catch." It's a periodic critique loop, not a build tool — it never edits code or the plan
file itself; it produces a report and lets Marc (or a follow-up session) decide what to act on.

## Personas

Four fixed lenses, always all four, never fewer:

1. **Product Manager** — north-star alignment (applications to hot postings/week + outreach
   touches/week → interviews/week, per `docs/EXECUTION_PLAN.md`), scope and sequencing, whether the
   current phase's exit criteria are the right bar, what's over-built vs under-built relative to
   Marc's actual job search needs.
2. **UX** — the real workflows Marc runs through the app (triage, tailor-resume, outreach-draft,
   dashboard funnel tile, Kanban board): friction, missing feedback, information architecture,
   anything that makes a *skill* invocation clunkier than it needs to be.
3. **Engineering Lead** — code health: test coverage (vitest), type safety (`tsc --noEmit`), tech
   debt, fragile spots, anything flagged in prior `code-reviewer` passes that never got addressed,
   delivery risk on the remaining phases.
4. **Architecture Lead** — schema design (companies/jobs/facts/applications/outreach/resumes), RLS
   posture, the ATS integration pattern (`lib/ats/*.ts`), API route vs subscription-skill split, and
   — since `AGENTS.md` warns this Next.js version has non-standard conventions — whether recent code
   actually follows `node_modules/next/dist/docs/` rather than assumed defaults.

Each persona subagent gets the **same shared context bundle** (below) plus its own lens description,
and must ground every finding in something it actually read — no generic advice. Findings without a
concrete file/line/table/doc reference get discarded during synthesis.

## Shared context bundle (gather once per round, before spawning)

Read fresh each round, not cached from round to round (state changes as findings get reported, and
concurrent sessions may write to the DB — see the DB read below):

- `docs/EXECUTION_PLAN.md`, `docs/NEXT_STEPS.md`
- `git log --oneline -20` and `git status`
- The live funnel counts (same query `careeros-orchestrator` uses) via `mcp__supabase__execute_sql`:
  ```sql
  select
    (select count(*) from facts where status='verified') as facts_verified,
    (select count(*) from facts where status='proposed') as facts_proposed,
    (select count(*) from resumes where master=true)     as master_resume,
    (select count(*) from jobs where status='new')       as jobs_untriaged,
    (select count(*) from jobs where status='interested') as jobs_interested,
    (select count(*) from applications)                  as applications,
    (select count(*) from outreach where status <> 'suggested') as outreach_active,
    (select count(*) from outreach where next_follow_up <= now()) as followups_overdue,
    (select count(*) from jobs where status='interviewing') as interviewing;
  ```
- From round 2 onward: the prior round's synthesis (see below), so personas react to what's already
  been raised instead of repeating it.

## Round protocol

1. Build/refresh the shared context bundle.
2. Spawn all four personas as **parallel `general-purpose` subagents in a single message** (four
   `Agent` tool calls, one message, `run_in_background: false` is fine since you need all four before
   synthesizing — but issue them together, not one at a time). Each prompt must include: the shared
   context bundle contents (paste the actual query results/log output, don't tell the subagent to
   re-fetch them — that wastes calls and risks a different DB snapshot per persona), the persona's
   lens description above, the prior round's synthesis if this isn't round 1, and an explicit output
   format: a short list of findings, each as `[severity: blocker|important|minor] <finding> — <file
   or table or doc it's grounded in>`.
3. **Synthesize**: merge all four persona reports yourself (main session, not a subagent). Dedupe
   near-identical findings across personas (a schema issue the architecture lead and engineering lead
   both flag is one finding, noted as cross-lens). Drop anything ungrounded per the rule above.
4. **Check convergence** before deciding on another round (see below).
5. If continuing, feed this round's synthesis into the next round's context bundle and repeat from
   step 1.

## Convergence rule (stop at diminishing returns, capped)

- **Hard cap: 3 rounds.** Never run a 4th regardless of findings — if it's not converging by then,
  report what you have and say so explicitly rather than looping further.
- **Early stop:** after round 2 or later, compare this round's *net-new, non-duplicate* findings
  against the previous round's total finding count. If new findings are less than ~25% of the prior
  round's count, or zero new `blocker`-severity findings appeared, stop — the remaining signal isn't
  worth another round of spend. State the ratio in the report so the stopping decision is visible,
  not just asserted.
- A round that produces zero new findings across all four personas always stops the loop, even on
  round 1 (rare, but don't force a second round just to hit a minimum).

## Output

Write the final synthesis to `docs/product-council/<YYYY-MM-DD>-review.md`:
- Funnel snapshot at time of review.
- Findings grouped by persona lens, severity-ordered within each.
- A short "cross-lens" section for findings multiple personas independently raised — these are the
  highest-confidence signal.
- The convergence trace (rounds run, new-finding counts per round, why it stopped).
- **No prioritized action plan or code changes** — that's a decision for Marc or a follow-up
  `careeros-orchestrator`/build-agent session, not this skill's job.

Report the same summary back in the session — don't make Marc open the file to see what happened.

## What this skill does NOT do

- Does not edit `docs/EXECUTION_PLAN.md`, code, or the schema — read-only across the board.
- Does not replace `careeros-orchestrator` — that still owns "what's the next step"; this owns "is
  the plan still right."
- Does not run unattended on a schedule by default — invoked manually, though Marc can wire it to
  `/schedule` later if he wants a recurring health check.
