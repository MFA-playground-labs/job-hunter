# Obsidian ↔ Supabase sync — next steps

Status: `scripts/sync-obsidian.ts` is built, typechecked, linted, and unit-verified against
the real vault note format (frontmatter parsing + fact-body extraction confirmed against the
three example notes in `01-Facts/`). It has **not** yet been run end-to-end against the live
Supabase project — no Supabase credentials are configured in this environment's `.env.local`
(only `VERCEL_OIDC_TOKEN` is set).

Not part of `lib/playbooks.ts` `PLAYBOOK_SOURCES` — this file won't get pulled into the
`playbooks` table by the import route; it's just a working note.

## Next steps, in order

1. **Add Supabase credentials to `.env.local`** (Project Settings → API in the Supabase
   dashboard):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose to the browser)

2. **First run: inbound only.**
   ```
   npm run sync:obsidian in
   ```
   This only touches the DB (`obsidian_notes` staging + `facts` inserts) — nothing is written
   to local vault files, and anything wrong can be deleted from the in-app Fact Inbox. Check the
   console summary for:
   - counts of new proposed / verified facts
   - any notes where `role_context` was defaulted to `cross-cutting` (means `subject_role`
     didn't match `ADP` / `EY-Parthenon` / `Accenture` — expected for the current example notes,
     worth checking once real facts are in `01-Facts/`)
   - any parse failures, listed by file path

3. **Verify in Supabase** (Table Editor or the app's Fact Inbox): confirm the facts that landed
   match what's in the vault notes, with correct `category`, `status`, `verified_at`.

4. **Re-run `in` with no vault changes** — confirm the console reports 0 new facts (content-hash
   dedupe working, safe to re-run repeatedly / put on a cadence).

5. **Second run: outbound.**
   ```
   npm run sync:obsidian out
   ```
   Writes/updates the managed `<!-- careeros:sync:start/end -->` block in `02-Companies/*.md`
   and `03-Roles/*.md`. Since the vault is gitignored, there's no git diff to review these
   writes against — open the changed files directly and confirm only the managed block changed,
   freeform sections (Overview, Research notes, etc.) untouched.

6. **Resolve the open design item**: `subject_role` in vault fact notes is free text (e.g.
   `"Acme Corp — Staff PM"`), but `facts.role_context` is a fixed enum
   (`ADP | EY-Parthenon | Accenture | cross-cutting`). Decide whether to:
   - rename real facts' `subject_role` values to match employer names exactly, or
   - extend `mapSubjectRoleToRoleContext()` in `scripts/sync-obsidian.ts` with real aliases once
     actual (non-example) fact notes exist.

7. **Decide on a cadence**: run manually before/after a fact-capture or vault-cleanup session,
   or wire it to a local cron/launchd job. (Not a Vercel cron — the vault only exists on this
   machine, so it can never run in the deployed app.)

8. **Optional follow-up**: `04-Interviews/*.md` "New facts surfaced" sections are intentionally
   out of scope (per the template, those get manually promoted into `01-Facts/` first) — revisit
   only if that manual promotion step turns out to be a real friction point.
