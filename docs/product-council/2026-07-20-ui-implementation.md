# UI/UX implementation advisory record — 2026-07-20

## Scope

UI-first CareerOS release covering the responsive application shell, Jobs, Dashboard, Pipeline,
Outreach, Companies, Inbox, Facts, Resumes, Settings, and global loading/error/setup states. The
fact-capture interview remains deferred and non-blocking.

## Board rounds

1. Product and UX rejected the first implementation for unsafe Outreach behavior, unrestricted job
   triage transitions, an incomplete mobile-dialog focus model, undersized controls, and inconsistent
   Dashboard/Pipeline semantics.
2. Engineering and Architecture rejected the first rework for read-then-write transition races,
   missing mutation feedback, incorrect passed-job freshness filtering, and a time-to-act metric based
   on mutable timestamps.
3. Rework added conditional compare-and-swap transitions, typed Pipeline/Outreach action results,
   pending/error UI, proposed-only Fact review, preserved Outreach status, accurate freshness, and
   dependent-route revalidation. The affected lenses were rerun for convergence.

## Verification evidence

- `git diff --check`: pass.
- `npm test`: 14 tests pass across two files.
- `npm run lint`: zero errors; one unrelated pre-existing unused-variable warning in the playbook
  import route.
- `npm run build`: pass on Next.js 16.2.10, including TypeScript and all 20 application routes.
- Bundled Next.js 16 layout, navigation, Server/Client Component, error, cache, Server Action, and
  Proxy guidance was reviewed before implementation.

## Deferred evidence

Responsive live-data screenshots at phone, tablet, and desktop widths remain unavailable because the
repository has no `.env.local`. Per the approved live-data-only decision, no sample records or preview
workspace were introduced. Visual QA should be repeated after Supabase credentials are configured.
