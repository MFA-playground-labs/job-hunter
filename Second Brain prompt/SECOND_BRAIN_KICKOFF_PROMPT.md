# Second Brain Kickoff Prompt

Paste this into Claude Code, pointed at wherever the Obsidian vault should live (a folder on disk — inside
this repo or separate, your call, see "Before you start" below).

---

I want to build an Obsidian vault that acts as a personal knowledge system ("second brain") whose primary
purpose is supporting my job search. I already have a Next.js/Supabase app in this repo (`job-hunter`) that
tracks the structured side of the search: companies, roles, contacts, interactions, applications,
resume_versions, and a `facts` table (a verified fact/story corpus used to feed AI resume-tailoring and
interview-prep prompts — see `.claude/agents/facts-migrator.md` and `docs/README.md`).

## Relationship between the vault and the app (decided — do not relitigate)

**Hybrid, weighted toward complement.** The vault is for capture, research, and non-linear thinking. The app
is the system of record for pipeline status and structured facts. Specifically:

- The vault does **not** track application stage/status. That's `applications.stage` in the app. Don't build
  a Kanban/pipeline view in Obsidian — it invites two sources of truth disagreeing with each other.
- Most notes (research, journal, interview prep) stay unstructured — no forced frontmatter.
- Only **fact-shaped notes** (stories/accomplishments destined for the `facts` table) get light frontmatter:
  `category`, `subject_role`, `verified` (bool), `verified_date`, `source_session`. This mirrors the `facts`
  table schema directly.
- Promotion is manual and deliberate: a fact note starts `verified: false`; once I'm confident enough to use
  it in a resume or interview answer, it flips to `verified: true` with a date. Only verified facts ever get
  exported.
- Export target is `docs/marc-facts.md` in the job-hunter repo, in the exact structure
  `.claude/agents/facts-migrator.md` expects: organized by role heading (e.g. `ROLE 1 — ADP`), then by
  category subheading (`Scope`, `Methods used`, `Outcomes`, `Artifacts/frameworks`,
  `Tradeoffs/judgment calls`), plus `Cross-Cutting Facts`, `Explicit Gaps`, and `Verified Corrections Log`
  sections. Bullets carry `[verified: YYYY-MM-DD]` tags where applicable. Do not invent a different export
  format — `facts-migrator` is a dumb, careful parser keyed to this exact structure.

## Vault structure to build

```
00-Inbox/          quick capture, unsorted — dumped here during research/interviews, sorted weekly
01-Facts/          one note per story/accomplishment (fact-shaped, has frontmatter)
02-Companies/      one note per company
03-Roles/          one note per role/application, links to its company
04-Interviews/     prep notes + post-interview retros, linked to a role
05-Contacts/       people, linked to companies/interactions
Templates/         Templater templates for each note type above
README.md          explains the system: what goes where, the promotion workflow, the export step
```

## Deliverables, in order

1. Confirm the vault's target path and whether it should be git-tracked (see "Before you start" — ask me,
   don't assume).
2. Create the folder structure above.
3. Build Templater templates for: Fact, Company, Role, Interview, Contact. Fact template frontmatter must
   match the `facts` table columns exactly (`category` restricted to
   `scope | method | outcome | artifact | tradeoff | domain | gap`, matching the DB's check constraint).
4. Write 2-3 example populated notes per type (clearly marked as examples, using placeholder company/role
   names — not real data) so I can see the pattern before using it for real.
5. Write Dataview queries as a reference note (`Templates/Dataview Queries.md` or similar) covering at
   least: "unverified facts by category," "facts not yet linked to any role," "roles with no linked facts."
6. Write the vault README covering the workflow end to end, including the manual export step into
   `docs/marc-facts.md` and a note that `facts-migrator` is non-destructive and safe to re-run.
7. Do **not** write an automated export script in this pass — the fact volume is small enough that manual
   copy-into-`marc-facts.md` is fine for now. Flag it as a future nice-to-have if the vault grows large, but
   don't build it unprompted.

## Before you start — ask me first

- Where should the vault live? (inside this repo as a top-level folder, e.g. `second-brain/`, vs. a
  separate directory/repo entirely — note this repo already contains real personal career data in
  `docs/marc-facts.md` once that lands, so err toward asking rather than assuming public/private status)
- Should the vault folder be gitignored if it lives inside this repo, or committed?
- Do I want the example notes seeded with any of my real company/role names from `supabase/seed.sql`
  (Vialto etc.), or should everything stay generic placeholder data until I populate it myself?

Do not create the vault folder or any files until these are answered.
