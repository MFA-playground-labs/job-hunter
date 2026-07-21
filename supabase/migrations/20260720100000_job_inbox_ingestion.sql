-- Job-inbox ingestion: cowork discovers jobs and writes Markdown into the
-- Obsidian vault; CareerOS imports those notes into `jobs`. See
-- docs/obsidian-job-inbox-contract.md and PRODUCT_ROADMAP.md Phase P0.
--
-- Adds the minimal identity + observation columns the importer needs to be
-- idempotent (stable posting id), detect changes (content hash), and preserve
-- availability history (first/last seen) without inventing history. The full
-- availability-vs-disposition state machine remains P5 (HARD-001).

alter table jobs
  add column if not exists posting_id text,
  add column if not exists content_hash text,
  add column if not exists first_seen_at timestamptz,
  add column if not exists last_seen_at timestamptz;

-- cowork is now a first-class discovery source alongside the ATS connectors.
alter table jobs drop constraint if exists jobs_source_check;
alter table jobs add constraint jobs_source_check
  check (source in ('greenhouse', 'ashby', 'lever', 'manual', 'funding_scan', 'cowork'));

-- Stable posting identity for idempotent re-import, scoped per owner. The
-- existing uq_jobs_owner_url index remains as a secondary guard.
create unique index if not exists uq_jobs_owner_posting_id
  on jobs (owner_id, posting_id) where posting_id is not null;
