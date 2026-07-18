# Job Hunter — Job Search Command Center

Helping me find a new job. Personal job search command center: a pipeline tracker (Kanban board
over companies/roles/applications) and a resume workspace (versioned, AI-tailored resumes).
Next.js on Vercel, Supabase for Postgres/Auth/Storage, Anthropic API for the AI layer.

This is Phase 1 only — see [`Phase 1 prompt/PHASE_1_KICKOFF_PROMPT.md`](Phase%201%20prompt/PHASE_1_KICKOFF_PROMPT.md)
for the full build plan and [`docs/README.md`](docs/README.md) for what's still missing.

## Stack

- Next.js (App Router, TypeScript, Tailwind, shadcn/ui)
- Supabase (Postgres, Auth, RLS) — see `supabase/migrations/`
- Anthropic API for resume tailoring / teardown / interview flows — see `app/api/`

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase + Anthropic credentials
npm run dev
```

Local Postgres via the Supabase CLI needs Docker:

```bash
npx supabase start
npx supabase db reset   # applies migrations + supabase/seed.sql
```

Without a configured Supabase project, every page renders a "Supabase isn't connected yet" state
instead of erroring.

## Current status

- **Schema**: `companies`, `roles`, `contacts`, `interactions`, `applications`, `resume_versions`,
  `facts` — all RLS-locked to `owner_id = auth.uid()`. See `supabase/migrations/`.
- **Seed data**: one real company/role/contact/interaction/application row set (Vialto, sourced from
  actual email threads) plus one placeholder job, in `supabase/seed.sql`.
- **API routes**: `/api/tailor`, `/api/teardown`, `/api/interview` are wired to Supabase + Anthropic,
  but run on placeholder system prompts — the real playbooks (`resume-tailoring.md`, `interviewer.md`,
  `resume-teardown.md`, `fact-capture.md`) haven't been dropped into `docs/` yet. Every stubbed
  response includes `"stubbed": true`.
- **Frontend**: pipeline board, role detail, resume workspace, dashboard are built against the real
  schema and shadcn/ui.
- **Not built yet**: role-discovery engine, outreach hub (Phase 2/3, out of scope for now).

## Still needed

Drop these into `docs/` to unlock full functionality — see `docs/README.md` for details:

- `job-search-command-center-proposal.md`
- `marc-facts.md`
- `resume-tailoring.md`, `interviewer.md`, `resume-teardown.md`, `fact-capture.md`
- current master resume
