# CareerOS — Next Steps Checklist

Running checklist of concrete actions, kept up to date as work progresses. Check items off as
completed. See `docs/EXECUTION_PLAN.md` for the full phased plan this feeds into.

## Phase A — Fuel (in progress, paused mid-interview on 2026-07-20)

Source material already dropped in `docs/Docs facts raw/`: `00 Index.md`, `Cross-Cutting Facts.md`,
`Explicit Gaps.md` (empty), `Corrections Log.md` (empty), `Role - ADP.md`, `Role - EY-Parthenon.md`,
`Role - Accenture.md`, `Fact Capture Playbook.md`, and `Marc Agosin Resume v12.docx` (full text
extracted and reviewed — Clover embedded-payroll build, HED publisher engagement, PRD-cycle
reduction, ACA release-cadence detail).

- [ ] **Resolve discrepancy**: `Role - ADP.md` says digital sales plan beaten by 25%; resume v12
      says 26% (~$5m). Confirm which number is correct.
- [ ] **ADP scope** — team size, reporting line, customer base for Embedded Products (currently
      the only role missing a Scope section).
- [ ] **Artifacts/frameworks** — one named framework/artifact per role (ADP, EY-Parthenon,
      Accenture) — all three sections are currently empty placeholders.
- [ ] **Tradeoffs/judgment calls** — one or two judgment calls per role showing non-obvious
      decisions — all three sections currently empty placeholders.
- [ ] **Explicit Gaps** — currently empty; a first-class category for this system. Confirm or
      correct candidates raised during scoring/review:
      - No direct headcount people-management (Accenture's 5 reports were matrixed/project-based;
        Clover's "5+ orgs" was cross-functional alignment, not people management)
      - No shipped customer-facing AI/ML product (AI work is PM-tooling-native, not product surface)
      - Any regulated-industry gaps (lending, healthcare compliance, etc.)
      - Anything else known to come up in screens
- [ ] Once the above are answered: consolidate everything (raw notes + resume + interview answers)
      into `docs/marc-facts.md` with `[verified: date]` markers on confirmed facts, show for review.
- [ ] Import via the facts-migrator agent per `lib/fact-import.ts` conventions; report inserted
      verified / proposed / skipped-duplicate counts.
- [ ] **[MARC]** Verify proposed facts at `/inbox`.
- [ ] **[MARC]** Paste master resume (have full text now, from v12.docx) into `/resumes` as
      `master=true`.

**Resume point:** run `docs/prompts/phase-a-fuel.md`, or just say "let's finish the facts
interview" — the three open questions above are exactly where to restart.

## Phase B onward

Not started — blocked on Phase A completing (verified facts + master resume). See
`docs/EXECUTION_PLAN.md` Phase B for the triage → tailor → apply sequence once unblocked.
