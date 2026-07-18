# Phase 1 Kickoff Prompt

Paste this into Claude Code once the five subagent files are installed in `.claude/agents/` and you've created empty Vercel + Supabase projects.

---

I'm building a personal job search command center — Phase 1 only: a pipeline tracker (Kanban board over companies/roles/applications) and a resume workspace (versioned tailored resumes, AI-assisted tailoring calls). Stack: Next.js on Vercel, Supabase for Postgres/Auth/Storage, Anthropic API for the AI layer.

I have five subagents installed: db-schema-architect, facts-migrator, frontend-builder, claude-api-integrator, code-reviewer. Use them for their respective domains rather than doing schema/frontend/API work directly yourself.

Reference docs I'll provide in this repo under `/docs/`:
- `job-search-command-center-proposal.md` — the full product plan (all phases, only build Phase 1 now)
- `marc-facts.md` — the fact corpus to migrate
- `resume-tailoring.md`, `interviewer.md`, `resume-teardown.md`, `fact-capture.md` — the playbooks to port into API routes
- current master resume

Sequence:
1. Have db-schema-architect design and write the Phase 1 schema (companies, roles, contacts, interactions, applications, resume_versions, facts) as Supabase migrations. Run code-reviewer on the output before applying migrations.
2. Have facts-migrator convert `marc-facts.md` into seed data for the `facts` table.
3. Have claude-api-integrator build `/api/tailor` and stub `/api/teardown` (full build if time allows), reading the actual playbook files from `/docs/`.
4. Have frontend-builder build the pipeline board, role detail view, resume workspace, and dashboard against the real schema.
5. Run code-reviewer after each major chunk, not just at the end.

Do not build the role-discovery engine or outreach hub yet — that's Phase 2/3. Ask me before making any decision not covered by the proposal doc (e.g., component library choices, auth flow specifics).

Start with step 1.
