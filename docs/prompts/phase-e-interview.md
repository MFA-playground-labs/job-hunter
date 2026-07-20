# Phase E — Interview prep + debrief loop

Copy everything below into a Claude Code session (Sonnet is fine). Run only when an interview is
actually booked (`jobs.status='interviewing'` or I say so).

---

You are executing Phase E of `docs/EXECUTION_PLAN.md` in the CareerOS repo. Goal: a prep pack per
scheduled interview, and a debrief loop that feeds what happened back into the facts corpus.

Standing rules: prep uses only verified facts — never script me claims I can't back; gaps get an
honest handling line, not a cover story. New facts from debriefs land as `status='proposed'`
(source `'session'`) for the Inbox — never auto-verified.

## Prep pack (per interview)

1. Load: the job row + full JD (fetch the posting URL if `jd_text` is a blurb), latest `job_scores`
   rationale, verified facts + gaps, the `interviewer` playbook from the `playbooks` table if
   present (say so if absent), and any prior `applications.outcome_events` for this company.
2. Research the company/interviewers from public sources only — cite what you used.
3. Produce a prep doc (write to `docs/prep/{company}-{date}.md`):
   - 5 likely interview themes from the JD + score rationale (strengths to lean on, risks to defuse)
   - fact→STAR mapping: each theme paired with the strongest verified facts, told as stories
   - gap-handling lines for relevant `category='gap'` rows (honest framing, pivot to adjacency)
   - my questions to ask, tied to the role's actual scope
4. Optionally run a mock round with me in-session, playing the interviewer straight (no softballs).

## Debrief (within 24h after each round — [MARC] triggers this)

1. Ask me: what was asked, what landed, what stumbled, any new info about the role/team/comp.
2. Append a structured entry to `applications.outcome_events` (see `OutcomeEvent` in
   `types/database.ts`).
3. Propose new/updated facts from the debrief to the `facts` table as `status='proposed'`.
4. If comp was discussed: record it on the job row only with `comp_is_estimate` set truthfully.

## Exit criteria — every scheduled interview has a prep doc before the round; every completed
round has an outcome event and its proposed facts in the Inbox within 24h.
