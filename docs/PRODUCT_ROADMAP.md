# CareerOS Product Roadmap

> **Canonical** implementation and progress tracker for CareerOS.
> Supersedes [EXECUTION_PLAN.md](./EXECUTION_PLAN.md) and [NEXT_STEPS.md](./NEXT_STEPS.md), which are retained as history only.
> Seed resume: [marc-resume.md](./marc-resume.md). Discovery interface: [obsidian-job-inbox-contract.md](./obsidian-job-inbox-contract.md). Architecture origin: [../HANDOFF.md](../HANDOFF.md).

## What changed in this revision (2026-07-20)

This roadmap was re-anchored around three owner decisions that reshaped the architecture, not just the ordering:

1. **Cowork owns job discovery and writes into Obsidian.** The app no longer needs to scan job boards itself. Cowork drops findings as Markdown into the vault; CareerOS imports them into Supabase for scoring and workflow. This removes almost all prior reliability/source-coverage work.
2. **Facts and interview capture are deferred and just-in-time.** The resume is the seed verified-fact corpus. Deep role facts, STAR stories, and gaps are captured per-role when the first application starts — not as an upfront blocker.
3. **The resume is provided** and seeds both the master resume and the initial verified facts.

Plus one owner directive: **the system should be self-learning** — bounded auto-tuning of ranking/calibration, transparent and reversible (not the prior "observational-only, gate every change" stance).

## Roadmap dashboard

| Field | Current value |
|---|---|
| Current phase | P0 — Seed |
| Product objective | Increase qualified interviews by shortening the discover-to-apply loop without sacrificing truth, control, or application quality. |
| Roadmap status | Active |
| Last updated | 2026-07-20 |

### North-star metric

**Qualified interviews per month.** A qualified interview is an interview for a role that passed the user's explicit fit calibration and application approval.

### Leading metrics

- High-fit jobs surfaced by cowork and imported within 24 hours of publication.
- Median time from import to Interested/Pass decision.
- Interested-to-applied conversion rate.
- Evidence-backed applications and outreach touches per week.
- Outreach reply rate and application-to-interview conversion rate.

### Guardrail metrics

- Imported postings without a resolvable URL: target **zero** (quarantined, never imported).
- Generated claims without verified fact references: target **zero**.
- Import duplicate rate (same posting imported twice): target **zero**.
- Ranking false-positive rate and score-override rate.
- Self-learning changes applied outside configured bounds: target **zero**.
- AI latency, schema-valid response rate, and monthly provider spend.
- Accessibility regressions and mobile task-completion failures.

### Phase progress

| Phase | Goal | Progress | Exit |
|---|---|---:|---|
| P0 | Seed: resume → master + facts; Obsidian job-inbox → Supabase importer | 0/4 | Pending |
| P1 | Discover & triage: cowork → import → score → Interested/Pass with reasons | 0/3 | Pending |
| P2 | Apply: tailor from verified facts, capture role facts JIT, submit + log | 0/4 | Pending |
| P3 | Self-learning: bounded, transparent, reversible calibration tuning | 0/3 | Pending |
| P4 | Outreach & interview loops; debriefs feed learning | 0/4 | Pending |
| P5 | Hardening backlog (triggered, not scheduled) | 0/3 | Pending |

### Active work

- **P0 code complete, pending DB run (2026-07-20).** SEED-002/004 (importer + truth-boundary tests) and the SEED-001/SEED-003 scripts are built and green (32 tests pass, typecheck + lint clean). Running them against Supabase is blocked on credentials (no `.env.local`; supabase MCP unauthorized). Once creds are set: `npm run seed:resume` then `npm run import:jobs`.
- Migration to apply: `supabase/migrations/20260720100000_job_inbox_ingestion.sql`.

## Amended decisions (supersede the originals where noted)

| ID | Decision | Supersedes |
|---|---|---|
| DEC-003′ | Supabase is canonical for **state/workflow**; **Obsidian is the authoritative job-discovery inbox** (cowork-written) and knowledge mirror. Jobs flow Obsidian → Supabase via idempotent, URL-gated import. | DEC-003 |
| DEC-005′ | Deterministic evidence still establishes that a job exists; enforcement moves to the **import boundary** — a cowork finding with no resolvable URL is **quarantined, not imported**. | DEC-005 (relocated, unchanged intent) |
| DEC-004′ | Keep the current single provider and skills-first approach. A provider-neutral gateway / second provider is **backlog**, pulled only if evidence demands it (cowork now owns discovery, reducing the need). | DEC-004 |
| DEC-007 | **The resume is the seed verified-fact corpus.** Deep role facts, STAR stories, and gaps are captured just-in-time at first application. The fact-capture interview is de-blocked and optional. | — |
| DEC-008 | **Self-learning is bounded, transparent, and reversible.** It auto-tunes ranking/calibration within configured limits, logs every change, emits a weekly digest, and supports one-click rollback. It tunes ranking only — never fabricates facts, never crosses the send/submit/verify boundary. | CON-005 stance |

Unchanged and still binding: **DEC-001** (optimize for qualified interviews, not volume), **DEC-002** (automate discovery/ranking/research/drafting; require approval before external sends, applications, or verified-fact changes), **DEC-006** (final application submission stays manual).

---

# P0 — Seed

**Outcome:** CareerOS can score and tailor immediately, and cowork's findings import cleanly and idempotently.

## SEED-001 — Ingest the resume as master + seed verified facts
- **Status:** Not started · **Priority:** P0 · **Dependencies:** None
- Import [marc-resume.md](./marc-resume.md) into `/resumes` as `master=true`.
- Derive one verified fact per resume claim, each referencing the resume as evidence (`status='verified'`).
- Include at least one honest `gap` fact placeholder to keep gaps first-class.
- **Exit:** master resume exists; seed facts are verified; Inbox reflects no false "proposed" backlog.

## SEED-002 — Build the Obsidian job-inbox importer
- **Status:** Not started · **Priority:** P0 · **Dependencies:** SEED-001
- Implement Obsidian → Supabase import per [obsidian-job-inbox-contract.md](./obsidian-job-inbox-contract.md).
- Enforce: no URL → quarantine; dedup by `posting_id` then canonical URL; idempotent on retry; `content_hash` change detection; preserve availability history and workflow state.
- **Exit:** the same scan note imported twice yields one job; a URL-less note quarantines; a changed body updates without duplicating.

## SEED-003 — Demote the app's own scanning
- **Status:** Not started · **Priority:** P1 · **Dependencies:** SEED-002
- Keep the existing ATS connectors as an optional secondary path; stop investing in Workday/custom-site/source-health as active work (moved to P5, triggered only).
- Document that cowork is the primary discovery mechanism.
- **Exit:** discovery ownership is unambiguous; no active work depends on app-side scanning reliability.

## SEED-004 — Truth-boundary tests at the import edge
- **Status:** Not started · **Priority:** P0 · **Dependencies:** SEED-002
- Fixture tests for: missing URL, duplicate posting, redirect/URL change, changed body, reappearing/closed posting.
- **Exit:** import guardrail metrics are covered by reproducible tests.

---

# P1 — Discover & triage

**Outcome:** Cowork's findings become a triaged pipeline with pass-reasons captured as learning signal.

## TRIAGE-001 — Score imported jobs against seed facts
- **Status:** Not started · **Priority:** P0 · **Dependencies:** SEED-001, SEED-002
- Run the existing scorer on imported jobs using the resume-seed verified facts as the corpus.
- Persist model, prompt, and calibration version with each score (minimum provenance for reproducibility).
- **Exit:** imported jobs carry a fit score with recorded inputs.

## TRIAGE-002 — Triage workbench with pass-reasons
- **Status:** Not started · **Priority:** P0 · **Dependencies:** TRIAGE-001
- Interested/Pass decisions with **required structured pass-reasons** (training signal for P3).
- Preserve list position and context during triage.
- **Exit:** ten jobs triageable without losing context; every Pass has a reason.

## TRIAGE-003 — Capture score overrides
- **Status:** Not started · **Priority:** P1 · **Dependencies:** TRIAGE-001
- Let Marc override fit with a structured reason; preserve original score immutably.
- **Exit:** overrides are first-class, reversible, and feed P3.

---

# P2 — Apply

**Outcome:** A high-fit opportunity becomes an approved, evidence-backed application — with role facts captured just-in-time here.

## APPLY-001 — Just-in-time role fact capture
- **Status:** Not started · **Priority:** P0 · **Dependencies:** SEED-001
- When Marc starts an application, prompt for role-specific facts (scope, quantified outcomes, STAR stories, honest gaps) and add them as verified/proposed facts.
- This is where the deferred fact/interview depth lands — per-role, not upfront.
- **Exit:** each started application has the role facts it needs; nothing was required before applications began.

## APPLY-002 — Tailor resume from verified facts only
- **Status:** Not started · **Priority:** P0 · **Dependencies:** APPLY-001
- Generate a tailored resume version using only verified facts + explicit gaps; require claim-level fact references; flag/reject unsupported claims before render; preserve the master.
- **Exit:** zero unsupported claims on the acceptance fixture; a new version, master preserved.

## APPLY-003 — Resume redlines and evidence links
- **Status:** Not started · **Priority:** P1 · **Dependencies:** APPLY-002
- Show additions/removals/rewrites vs master; link each generated claim to its fact; accept/reject per change.
- **Exit:** redline is correct and every claim is traceable.

## APPLY-004 — Record manual submission + next action
- **Status:** Not started · **Priority:** P0 · **Dependencies:** APPLY-002
- Marc confirms submission (date, resume version, optional evidence); create the next follow-up action; no automatic external submission (DEC-006).
- **Exit:** full Interested → Applied flow; funnel updates from confirmed events only.

---

# P3 — Self-learning (bounded)

**Outcome:** Ranking/calibration improves from real signal, within limits, transparently and reversibly (DEC-008).

## LEARN-001 — Aggregate learning signals
- **Status:** Not started · **Priority:** P1 · **Dependencies:** TRIAGE-002, TRIAGE-003, APPLY-004
- Aggregate pass-reasons, score overrides, resume edits, outreach replies, and interview outcomes into calibration signal.
- **Exit:** signals are collected and attributable, never treated as automatic labels.

## LEARN-002 — Bounded auto-tuning engine
- **Status:** Not started · **Priority:** P1 · **Dependencies:** LEARN-001
- Auto-adjust calibration weights within configured bounds; log every change with before/after and the triggering signal; emit a weekly digest; one-click rollback.
- Hard limit: tunes ranking only — never fabricates facts, never changes send/submit/verify gates.
- **Exit:** a calibration change occurs from real signal, stays within bounds, and is reversible.

## LEARN-003 — Regression guard
- **Status:** Not started · **Priority:** P1 · **Dependencies:** LEARN-002
- Maintain a small labeled evaluation set; re-run before any auto-tune takes effect; block changes that regress it beyond threshold.
- **Exit:** self-learning cannot ship a ranking regression.

---

# P4 — Outreach & interview loops

**Outcome:** Every active application has a visible next action; every interview has an evidence-backed prep and debrief.

## OUT-001 — First-class next actions
- **Status:** Not started · **Priority:** P0 · **Dependencies:** APPLY-004
- Model action type, entity, owner, due date, completion, snooze; surface overdue/upcoming in Today.

## OUT-002 — Approval-gated outreach drafts
- **Status:** Not started · **Priority:** P1 · **Dependencies:** OUT-001
- Draft from verified facts + explicit context; include evidence; **save only** — Marc approves and sends externally (DEC-002).

## INT-001 — Interview prep packs (deferred facts mature here)
- **Status:** Not started · **Priority:** P1 · **Dependencies:** APPLY-004
- On entering interviewing, generate sourced company/role context, likely questions, story mapping from verified facts, and honest gap-handling. Propose missing facts to the Inbox rather than inventing them.

## INT-002 — Post-interview debriefs feed learning
- **Status:** Not started · **Priority:** P1 · **Dependencies:** INT-001, LEARN-001
- Capture round, questions, signals, outcomes; create proposed facts only when Marc identifies reusable evidence; feed P3.

---

# P5 — Hardening backlog (triggered, not scheduled)

**Outcome:** Rescued high-value engineering, pulled in only when a real problem appears. Do **not** schedule these upfront.

- **HARD-001 — Posting availability vs. user disposition split.** Separate "is the posting open" from "what did Marc decide," so closure never loses Applied/Interviewing history. *Trigger: a closed posting corrupts workflow state.*
- **HARD-002 — Stable posting identity beyond URL.** Content-hash + canonical-URL + external-id identity to survive redirects/reposts. *Trigger: duplicate or reposted jobs cause a bad decision.* (Partially satisfied already by the import contract's `posting_id`.)
- **HARD-003 — Claim-level score evidence + confidence.** Link each score claim to exact job text and verified facts; expose confidence honestly. *Trigger: a score's certainty misleads a decision.*

Also parked here (pull only on evidence): provider-neutral AI gateway / second provider (DEC-004′), durable workflow runs, two-way Obsidian conflict protocol (inbound job/fact import is one-way by design), Workday / custom-site connectors, embeddings, coach module.

---

# Areas of concern register

Status values: `Open`, `Monitoring`, `Mitigated`, `Accepted`, `Closed`. Carried over from the prior roadmap; amended for the new architecture.

| ID | Concern | Severity | Current mitigation | Status |
|---|---|---|---|---|
| CON-001 | AI scores may appear more certain than their evidence supports. | High | Provenance now; claim-level evidence deferred to HARD-003. | Open |
| CON-002 | Tailored artifacts may introduce claims absent from verified facts. | Critical | Verified-fact-only generation, claim references, approval gate (APPLY-002). | Open |
| CON-003 | Closed, duplicate, redirected, or fabricated postings may contaminate the funnel. | Critical | Import-boundary URL gate, `posting_id` dedup, availability history (SEED-002/004). | Open |
| CON-005′ | Self-learning may drift ranking in the wrong direction. | High | Bounded auto-tune, logging, weekly digest, rollback, regression guard (P3). | Open |
| CON-006 | External messages, submissions, or verification may cross automation boundaries. | Critical | Explicit approval before send/submit/verify (DEC-002). | Open |
| CON-011′ | Cowork/Obsidian import may duplicate or overwrite content. | Critical | Managed-block-only writes, idempotent import, `content_hash`, one-way inbound (SEED-002). | Open |
| CON-016 | Single-user service assumptions may select the wrong owner. | Critical | Explicit owner context; fail closed on ambiguity. | Open |
| CON-017 | Application volume may be mistaken for interview conversion. | High | Qualified interviews as north star; guardrail funnel metrics. | Open |
| CON-018 | Platform work may distract from conversion. | Medium | P5 is triggered, not scheduled; phases ordered by conversion impact. | Open |

---

# Append-only registers

Do not rewrite or delete historical entries. If an entry is wrong, add a correcting entry that references it.

## Product decisions

| ID | Date | Decision | Owner |
|---|---|---|---|
| DEC-001 | 2026-07-20 | Optimize for qualified interviews, not volume. | Marc |
| DEC-002 | 2026-07-20 | Automate discovery/ranking/research/drafting; approval before external sends, applications, verified-fact changes. | Marc |
| DEC-003′ | 2026-07-20 | Supabase canonical for state; Obsidian is the job-discovery inbox + mirror; jobs import one-way, URL-gated. | Marc |
| DEC-004′ | 2026-07-20 | Keep current single provider, skills-first; provider-neutral gateway is backlog. | Marc |
| DEC-005′ | 2026-07-20 | Truth boundary enforced at import: no resolvable URL → quarantine. | Marc |
| DEC-006 | 2026-07-20 | Final application submission stays manual. | Marc |
| DEC-007 | 2026-07-20 | Resume seeds verified facts; deep facts captured JIT at first application. | Marc |
| DEC-008 | 2026-07-20 | Self-learning is bounded, transparent, reversible; tunes ranking only. | Marc |

## Roadmap change log

| Date | Work item | Change |
|---|---|---|
| 2026-07-20 | ROADMAP | Created the original canonical roadmap (M0–M5, Product Council model). |
| 2026-07-20 | ROADMAP | **Revised to canonical v2:** re-anchored on cowork/Obsidian job discovery, resume-seeded facts with JIT deep-fact capture, and bounded self-learning. Superseded EXECUTION_PLAN.md and NEXT_STEPS.md; demoted app-side scanning and source-coverage work to a triggered P5 backlog; added the Obsidian job-inbox contract and master resume as seed. |
