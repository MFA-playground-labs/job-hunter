# CareerOS — Execution Plan (post-build)

Phased roadmap from the 2026-07-20 CPO review. The app is built (Phases 1–2 of HANDOFF.md done,
all 45 jobs scored); this plan is about **using** it to land a tier-1 role, plus the small builds
that remove friction. Each phase lists who executes: **Marc** (only he can), a **skill** (invoke in
a Claude Code session), or a **subagent** from `.claude/agents/`.

North-star metric: applications to hot (<24h) postings/week + outreach touches/week → interviews/week.
Decisions locked: fuel + funnel first; Phase-3 features ship as skills, not API routes.

---

## Phase A — Fuel (blocking everything; Marc + facts-migrator)

The facts corpus and master resume are the inputs every downstream module needs. Nothing else
compounds until this is done.

1. **Fact-capture interview** — Marc answers the 5-question brain-dump (career spine, quantified
   outcomes, AI-native evidence, consulting-to-PM story, honest gaps) in a Claude Code session.
   The session structures answers into `docs/marc-facts.md` with `[verified: date]` markers.
   *Agent:* main session (conversational), then **facts-migrator** to import into the `facts`
   table (mirror `lib/fact-import.ts` validation; marked → `status='verified'`, else `'proposed'`).
2. **Verify in the Fact Inbox** (`/inbox`) — Marc approves/edits/rejects proposed facts. *Marc only.*
3. **Master resume** — Marc pastes it into `/resumes` (stored `master=true`). *Marc only.*

**Exit criteria:** `facts` has verified rows incl. ≥1 `gap`; a `master=true` resume exists; Inbox empty.

## Phase B — Funnel (first applications; Marc + skills)

4. **Triage the digest** (`/jobs`) — Interested / Pass with reasons on all 45 scored jobs.
   Pass reasons are training data; never skip them. *Marc only (~30 min).*
   Suggested first-pass order: OpenAI API Agents (88), Scale AI Director Fwd-Deployed (86),
   Sierra Agent Dev (85), Brex Director Growth/AI (84), Ramp Agentic CX (83).
5. **Optional re-score after facts land** — role_content_fit was scored without a corpus; re-run
   scoring on Interested jobs only. *Skill:* `scan-jobs` (scoring step only).
6. **Tailor + apply, top 3–5 Interested jobs** — *Skill:* `tailor-resume` per job; Marc submits the
   application and logs it (creates the `applications` row, links the resume). Target: first
   applications within 48h of triage.

**Exit criteria:** ≥3 `applications` rows; each linked to a tailored `resumes` row; funnel tile non-zero.

## Phase C — Outreach engine (parallel with B; Marc + outreach-draft skill)

7. **Seed outreach targets** — zero-openings target companies (Companies page signal) + any
   Interested-company contacts Marc actually has. One-tap create from `/jobs`, or manual add.
8. **Draft first batch** — *Skill:* `outreach-draft` (Gmail drafts only; Marc sends). 5–8 touches.
9. **Weekly cadence** — start each week by invoking `outreach-draft` against overdue
   `next_follow_up` rows. Two unanswered follow-ups → dormant.

**Exit criteria:** ≥5 outreach rows past `'suggested'`; follow-up dates populated; weekly rhythm held.

## Phase D — Automation & coverage (agents; after B has momentum)

10. **Scheduled scans 2x/day** — set up via `/schedule` (cloud routine invoking the scan-jobs
    flow) or Vercel cron (v1 API route, needs env keys + calibration-reuse flag surfaced). *Marc
    triggers setup; main session assists.* Goal: hot postings triaged inside the 24h window.
11. **Workday + custom-site fetchers** — schema already supports `ats_type in ('workday','custom')`;
    a concurrent session already loads big-tech boards manually. Build `lib/ats/workday.ts`
    (fixture-tested, same pure-parse pattern as greenhouse/ashby/lever) and wire into the scan
    route + skill. *Agents:* **general-purpose** (research Workday CxS API shapes) →
    **frontend-builder**/**db-schema-architect** as needed → **code-reviewer** before commit.
12. **Weekly funnel review ritual** — Monday: dashboard funnel tile + median-time-to-act; adjust
    calibration dials if pass reasons show a pattern (e.g. repeated comp_too_low → raise floor).
    *Marc + main session.*

**Exit criteria:** scans run without manual invocation; big-tech targets visible; weekly review happening.

## Phase E — Interview conversion (build only when interviews are booked)

13. **`interview-prep` skill** — per-job prep pack: JD + score rationale + verified facts + company
    research → likely questions, story mapping (facts → STAR), gap-handling lines. Same
    skills-first pattern; drafts a prep doc, proposes new facts to the Inbox after debriefs.
14. **Post-interview debrief loop** — after each round, capture what was asked + how it went as
    proposed facts; feed `applications.outcome_events`.

**Exit criteria:** every scheduled interview has a prep pack; debriefs captured within 24h.

## Explicitly deferred (do not build)

Embeddings/vector search, coach module, Obsidian sync, funding-scan enhancements, any new API
routes for LLM features (skills-first decision stands).

## Standing rules for agent execution

- Re-check DB counts before bulk writes — concurrent sessions write to the same Supabase project.
- Truth discipline everywhere: no fabricated postings/facts/comp; estimates labeled; nothing
  auto-commits to `facts` (proposed → Inbox).
- Code changes: typecheck + vitest + **code-reviewer** subagent before commit.
