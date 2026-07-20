# CareerOS execution prompts

Copy-paste prompts for driving `docs/EXECUTION_PLAN.md`, written to be run with **Sonnet** —
explicit and procedural, no context assumed beyond the repo.

**Default way to run:** start a session and say
> Use the careeros-orchestrator agent: what's next?

The orchestrator reads live DB state, tells you the current phase, and points at the prompt to run.
Or skip it and run a phase prompt directly:

| File | Phase | Run when |
|---|---|---|
| `phase-a-fuel.md` | A — Facts corpus + master resume | First. Blocking everything. |
| `phase-b-funnel.md` | B — Triage → tailor → apply | After A. Weekly until pipeline is warm. |
| `phase-c-outreach.md` | C — Outreach drafts + cadence | Parallel with B. Weekly. |
| `phase-d-automation.md` | D — Scheduled scans + Workday fetcher | Once B has momentum. One-time builds. |
| `phase-e-interview.md` | E — Interview prep + debrief | Only when an interview is booked. |

Every prompt embeds the standing rules (truth discipline, drafts-only, concurrent-DB checks).
Steps only you can do (verifying facts, sending mail, submitting applications) are marked
**[MARC]** — the agent must stop and hand those to you.
