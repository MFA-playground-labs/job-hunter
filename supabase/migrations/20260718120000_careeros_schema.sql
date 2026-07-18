-- CareerOS schema: single verified-facts corpus + job/funding scanner + pipeline.
-- Replaces the earlier Phase-1 schema (roles/resume_versions/interactions) wholesale;
-- no live data existed. Single-user app, but every table is RLS-locked to
-- owner_id = auth.uid() anyway (Supabase exposes tables via API by default).
--
-- Embedding columns are dimensionless `extensions.vector` on purpose: the embedding
-- provider (Voyage vs OpenAI, differing dims) is deliberately deferred. Vector
-- indexes + a match_facts() RPC land in a later migration once a provider is chosen.

create extension if not exists vector with schema extensions;

-- Shared updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- companies: scan targets + watch list. tier='watch' IS the proposal state —
-- approval means Marc changes tier to target_1/target_2/broad himself
-- (companies are never silently added to the target list).
create table companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  ats_slug text,
  ats_type text check (ats_type in ('greenhouse', 'ashby', 'lever')),
  tier text not null default 'watch' check (tier in ('target_1', 'target_2', 'broad', 'watch')),
  source text not null default 'manual' check (source in ('manual', 'funding_scan', 'seed')),
  funding_stage text,
  last_funding_at date,
  funding_source_url text,
  fit_rationale text,
  ats_last_status text, -- e.g. 'ok', 'not_found', 'error: ...' from the last scan probe
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- jobs: every row links to a real posting (url required for scanned jobs; hard rule).
-- Postings are perishable: scanned_at > 14 days = stale, displayed as such, never updated.
create table jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  title text not null,
  url text not null,
  source text not null default 'manual'
    check (source in ('greenhouse', 'ashby', 'lever', 'manual', 'funding_scan')),
  location text,
  level_signal text,
  comp_range text,
  comp_is_estimate boolean not null default true,
  jd_text text,
  jd_embedding extensions.vector,
  scanned_at timestamptz,
  status text not null default 'new' check (
    status in ('new', 'interested', 'passed', 'applied', 'interviewing', 'offer', 'rejected', 'closed')
  ),
  -- Pass reasons are training data for future scoring; persist them.
  pass_reason text check (
    pass_reason in ('comp_too_low', 'brand_mismatch', 'wrong_scope', 'location', 'domain', 'other')
  ),
  pass_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- calibrations: per-scan dials. A scan run must reference an explicitly chosen
-- calibration — dials are never silently reused (enforced in the scan UI/API).
create table calibrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text not null,
  total_comp_floor numeric,
  base_floor numeric,
  brand_weight numeric not null default 1,
  exit_weight numeric not null default 1,
  created_at timestamptz not null default now()
);

-- job_scores: component scores AND rationale — Marc must see why a job ranked
-- where it did. Stamped with the model that produced it (traceability NFR).
create table job_scores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  calibration_id uuid references calibrations(id) on delete set null,
  composite numeric not null,
  comp_fit numeric not null,
  brand numeric not null,
  exit_opportunity numeric not null,
  role_content_fit numeric not null,
  rationale text not null,
  model text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- facts: the atomic verified-facts corpus — the product. Nothing enters
-- 'verified' without Marc's approval ("you propose; he commits").
-- Gaps (category='gap') are first-class: they prevent stretching non-existent
-- experience. category/source are a small superset of the spec so the
-- marc-facts.md import and edit-mining (Phase 3) never hit constraint errors.
create table facts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role_context text not null default 'cross-cutting'
    check (role_context in ('ADP', 'EY-Parthenon', 'Accenture', 'cross-cutting')),
  category text not null check (
    category in ('scope', 'method', 'outcome', 'artifact', 'tradeoff', 'domain', 'gap', 'preference')
  ),
  body text not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'verified', 'corrected', 'retired')),
  source text not null default 'manual' check (
    source in ('interview', 'obsidian', 'resume', 'scan_feedback', 'seed', 'manual', 'edit_mining')
  ),
  verified_at timestamptz,
  embedding extensions.vector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- fact_corrections: audit trail (OLD -> NEW with reason). The old fact is set
-- to status='corrected'; the new one goes through the normal proposal flow.
create table fact_corrections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  old_fact_id uuid not null references facts(id) on delete cascade,
  new_fact_id uuid not null references facts(id) on delete cascade,
  reason text not null,
  corrected_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- resumes: versioned; exactly one master (partial unique index below).
create table resumes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  master boolean not null default false,
  target_job_id uuid references jobs(id) on delete set null,
  label text not null,
  body text not null,
  derived_from uuid references resumes(id) on delete set null,
  ats_keyword_report jsonb,
  created_by text not null default 'user' check (created_by in ('user', 'ai')),
  model text, -- set when created_by='ai' (traceability)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  resume_id uuid references resumes(id) on delete set null,
  applied_at date,
  -- Timeline of outcome events: [{type: response|screen|onsite|offer|rejection, at, note}]
  outcome_events jsonb not null default '[]'::jsonb,
  outcome_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- funding_events: extracted from free RSS sources. company_id is nullable —
-- events are extracted before a companies row exists; the fit-evaluation pass
-- links them when it proposes a watch company.
create table funding_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  company_name text not null,
  round text,
  amount text,
  sector text,
  announced_at date,
  source_url text not null,
  relevance_score numeric,
  fit_evaluated boolean not null default false,
  created_at timestamptz not null default now()
);

-- sessions: transcripts + per-call cost log. Scan runs are sessions too, so
-- model_costs is the single source for the monthly spend widget.
create table sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (
    type in ('coach', 'interview', 'tailoring', 'teardown', 'job_scan', 'funding_scan',
             'fact_import', 'playbook_import', 'edit_mining', 'outcome_synthesis')
  ),
  transcript jsonb not null default '[]'::jsonb,
  fact_proposals jsonb not null default '[]'::jsonb,
  -- [{model, task, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd, at}]
  model_costs jsonb not null default '[]'::jsonb,
  summary text,
  created_at timestamptz not null default now()
);

-- obsidian_notes: inbound vault sync staging (webhook ingestion lands Phase 4;
-- table exists now so later phases need no schema churn).
create table obsidian_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  path text not null,
  frontmatter jsonb,
  body text,
  content_hash text not null,
  synced_at timestamptz not null default now(),
  processed boolean not null default false
);

create table outreach (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contact text not null,
  company_id uuid references companies(id) on delete set null,
  channel text check (channel in ('linkedin', 'email', 'intro', 'other')),
  status text not null default 'suggested' check (
    status in ('suggested', 'drafted', 'sent', 'replied', 'meeting', 'dormant', 'closed')
  ),
  notes text,
  last_touch date,
  next_follow_up date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- playbooks: the markdown system prompts, imported verbatim from the vault and
-- editable in-app. slug is the stable identity; content_hash makes reimport idempotent.
create table playbooks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug text not null,
  module text not null check (
    module in ('tailoring', 'interviewer', 'teardown', 'fact_capture', 'job_hunter',
               'career_coach', 'outreach')
  ),
  title text not null,
  body text not null,
  content_hash text not null,
  source_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes: every FK + hot filters.
create index idx_companies_owner_id on companies(owner_id);
create index idx_companies_tier on companies(tier);
create unique index uq_companies_owner_name on companies(owner_id, lower(name));

create index idx_jobs_owner_id on jobs(owner_id);
create index idx_jobs_company_id on jobs(company_id);
create index idx_jobs_status on jobs(status);
create index idx_jobs_scanned_at on jobs(scanned_at);
create unique index uq_jobs_owner_url on jobs(owner_id, url); -- dedupe by URL

create index idx_calibrations_owner_id on calibrations(owner_id);

create index idx_job_scores_owner_id on job_scores(owner_id);
create index idx_job_scores_job_id on job_scores(job_id);
create index idx_job_scores_calibration_id on job_scores(calibration_id);

create index idx_facts_owner_id on facts(owner_id);
create index idx_facts_status on facts(status);
create index idx_facts_category on facts(category);
create index idx_facts_role_context on facts(role_context);

create index idx_fact_corrections_owner_id on fact_corrections(owner_id);
create index idx_fact_corrections_old_fact_id on fact_corrections(old_fact_id);
create index idx_fact_corrections_new_fact_id on fact_corrections(new_fact_id);

create index idx_resumes_owner_id on resumes(owner_id);
create index idx_resumes_target_job_id on resumes(target_job_id);
create index idx_resumes_derived_from on resumes(derived_from);
create unique index uq_resumes_one_master on resumes(owner_id) where master;

create index idx_applications_owner_id on applications(owner_id);
create index idx_applications_job_id on applications(job_id);
create index idx_applications_resume_id on applications(resume_id);

create index idx_funding_events_owner_id on funding_events(owner_id);
create index idx_funding_events_company_id on funding_events(company_id);
create unique index uq_funding_events_dedupe
  on funding_events(owner_id, lower(company_name), source_url);

create index idx_sessions_owner_id on sessions(owner_id);
create index idx_sessions_type on sessions(type);
create index idx_sessions_created_at on sessions(created_at);

create index idx_obsidian_notes_owner_id on obsidian_notes(owner_id);
create unique index uq_obsidian_notes_owner_path on obsidian_notes(owner_id, path);

create index idx_outreach_owner_id on outreach(owner_id);
create index idx_outreach_company_id on outreach(company_id);
create index idx_outreach_status on outreach(status);
create index idx_outreach_next_follow_up on outreach(next_follow_up);

create index idx_playbooks_owner_id on playbooks(owner_id);
create unique index uq_playbooks_owner_slug on playbooks(owner_id, slug);

-- updated_at triggers.
create trigger trg_companies_updated_at before update on companies
  for each row execute function public.set_updated_at();
create trigger trg_jobs_updated_at before update on jobs
  for each row execute function public.set_updated_at();
create trigger trg_facts_updated_at before update on facts
  for each row execute function public.set_updated_at();
create trigger trg_resumes_updated_at before update on resumes
  for each row execute function public.set_updated_at();
create trigger trg_applications_updated_at before update on applications
  for each row execute function public.set_updated_at();
create trigger trg_outreach_updated_at before update on outreach
  for each row execute function public.set_updated_at();
create trigger trg_playbooks_updated_at before update on playbooks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: every table locked to auth.uid() = owner_id.
alter table companies enable row level security;
alter table jobs enable row level security;
alter table calibrations enable row level security;
alter table job_scores enable row level security;
alter table facts enable row level security;
alter table fact_corrections enable row level security;
alter table resumes enable row level security;
alter table applications enable row level security;
alter table funding_events enable row level security;
alter table sessions enable row level security;
alter table obsidian_notes enable row level security;
alter table outreach enable row level security;
alter table playbooks enable row level security;

create policy "Owner can manage own companies" on companies
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can manage own jobs" on jobs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can manage own calibrations" on calibrations
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can manage own job_scores" on job_scores
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can manage own facts" on facts
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can manage own fact_corrections" on fact_corrections
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can manage own resumes" on resumes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can manage own applications" on applications
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can manage own funding_events" on funding_events
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can manage own sessions" on sessions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can manage own obsidian_notes" on obsidian_notes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can manage own outreach" on outreach
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owner can manage own playbooks" on playbooks
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
