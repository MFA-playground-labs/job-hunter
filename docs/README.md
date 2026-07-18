# CareerOS input files

Add Marc's source material here. `marc-facts.md` is imported by the Fact Import action; verified
markers such as `[verified: 2026-07-18]` are retained. Add the master resume in Markdown or paste
it into the Resumes screen.

- `job-search-command-center-proposal.md` — full product plan (all phases; only Phase 1 is being built now)
- `marc-facts.md` — fact corpus for the `facts` table (facts-migrator subagent). Nothing has been
  migrated into `facts` yet because this file doesn't exist anywhere accessible (repo, Gmail, prior
  sessions) — the migration is a no-op until it's added here.
- `resume-tailoring.md` — playbook for `POST /api/tailor` (claude-api-integrator subagent)
- `interviewer.md` — playbook for `POST /api/interview`
- `resume-teardown.md` — playbook for `POST /api/teardown`
- `fact-capture.md` — "FACT CAPTURE — SESSION END" logic for writing new facts back to the DB
- Current master resume (any format) — used as tailoring input

Until these land, the corresponding API routes ship with real DB/Anthropic plumbing but a stubbed
system prompt (see `TODO` markers in `app/api/*/route.ts`) rather than invented playbook logic.
