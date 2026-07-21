# Obsidian Job-Inbox Contract

> The interface between **cowork** (job discovery) and **CareerOS** (scoring + workflow).
> Cowork scans jobs and writes one Markdown note per posting into the Obsidian vault.
> CareerOS imports those notes into Supabase. This file is the authority on the note shape.
> Referenced by PRODUCT_ROADMAP.md, Phase P0. Last updated: 2026-07-20.

## Where notes go

Cowork writes job findings as individual notes under the vault's `Job findings/` directory
(daily scan summaries may still live under `Daily Scans/`). One posting = one note.

## Required frontmatter

Every note MUST carry this managed frontmatter block. CareerOS reads only these fields;
everything below the managed block is freeform and never overwritten.

```yaml
---
careeros_managed: true          # marks the block CareerOS owns
posting_id: <stable-id>         # REQUIRED. Stable identity: `${source}:${external_id}`
                                #   or, if no external id, a hash of the canonical URL.
url: <resolvable-posting-url>   # REQUIRED. A real, fetchable posting URL.
source: <where-found>           # e.g. greenhouse | ashby | lever | linkedin | cowork-web
company: <company-name>         # REQUIRED
role: <job-title>               # REQUIRED
location: <location-or-remote>
comp: <string>                  # OPTIONAL. If inferred, prefix "est: " — never present an estimate as fact.
first_seen: <ISO-8601>          # when cowork first observed this posting
last_seen: <ISO-8601>           # most recent observation
content_hash: <hash>            # OPTIONAL/advisory: CareerOS recomputes this from the body on import
status: inbox                   # cowork always writes `inbox`; CareerOS owns transitions after import
---
```

## Note body

- The full job description text (the raw source snapshot) goes in the body, verbatim.
- CareerOS preserves this snapshot as evidence; it is never rewritten on re-import.

## Import rules (enforced at the Obsidian → Supabase boundary)

These encode DEC-005 (deterministic sources establish that a job exists; AI may enrich but not invent):

1. **No `url` → quarantine.** A finding without a resolvable URL is never imported as a job; it lands in a review queue instead. This is the hard truth boundary.
2. **Dedup by `posting_id`, then canonical `url`.** Re-importing the same note updates the existing job; it never creates a duplicate. Idempotent on every retry.
3. **Change detection via `content_hash`.** CareerOS recomputes the hash from the note body (the body is the evidence, so it defines identity) — the frontmatter `content_hash` is advisory. A changed body updates the snapshot and re-flags for scoring, but preserves posting identity, disposition, and history. Missing `posting_id` is derived deterministically from the URL, so a note with a URL but no id still imports.
4. **Preserve availability history.** Import records `first_seen` / `last_seen`; a posting disappearing from scans marks it closed/stale without deleting your workflow state (Applied, Interviewing, outcomes survive).
5. **Never overwrite freeform content.** CareerOS only reads/writes inside the `careeros_managed` frontmatter block.

## Out of scope for cowork

- Cowork does not score, triage, or set disposition. It only discovers and records postings with evidence.
- Cowork does not write facts, resumes, or applications. Those flow through CareerOS with the truth/approval gates intact.
