-- Phase 1 schema: companies, roles, contacts, interactions, applications,
-- resume_versions, facts. Single-user app; every table is locked to
-- owner_id = auth.uid() via RLS (Supabase exposes tables via API by default,
-- so this is required regardless of single-user status).

create table companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  tier text,
  funding_stage text,
  notes text,
  created_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  jd_text text,
  source_url text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  status text,
  comp_score numeric,
  brand_score numeric,
  exit_score numeric,
  content_score numeric,
  composite_score numeric
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  name text not null,
  relationship_strength smallint check (relationship_strength between 1 and 5),
  last_contact_date date
);

create table interactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  type text not null check (type in ('message', 'call', 'email')),
  date date not null,
  notes text,
  thread_status text
);

create table resume_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  content text,
  tailoring_notes text,
  created_at timestamptz not null default now()
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  resume_version_id uuid references resume_versions(id) on delete set null,
  stage text not null default 'discovered' check (
    stage in (
      'discovered', 'interested', 'applied', 'interviewing',
      'offer', 'closed_won', 'closed_lost', 'withdrawn'
    )
  ),
  applied_date date,
  next_action text,
  next_action_date date
);

create table facts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (
    category in ('scope', 'method', 'outcome', 'artifact', 'tradeoff', 'domain', 'gap')
  ),
  subject_role text,
  fact_text text not null,
  verified_date date,
  source_session text
);

-- Indexes: every FK, plus columns used for dashboard filtering.
create index idx_companies_owner_id on companies(owner_id);

create index idx_roles_owner_id on roles(owner_id);
create index idx_roles_company_id on roles(company_id);
create index idx_roles_status on roles(status);

create index idx_contacts_owner_id on contacts(owner_id);
create index idx_contacts_company_id on contacts(company_id);

create index idx_interactions_owner_id on interactions(owner_id);
create index idx_interactions_contact_id on interactions(contact_id);
create index idx_interactions_date on interactions(date);

create index idx_resume_versions_owner_id on resume_versions(owner_id);
create index idx_resume_versions_role_id on resume_versions(role_id);

create index idx_applications_owner_id on applications(owner_id);
create index idx_applications_role_id on applications(role_id);
create index idx_applications_resume_version_id on applications(resume_version_id);
create index idx_applications_stage on applications(stage);
create index idx_applications_next_action_date on applications(next_action_date);

create index idx_facts_owner_id on facts(owner_id);
create index idx_facts_category on facts(category);
create index idx_facts_subject_role on facts(subject_role);

-- RLS: every table locked to auth.uid() = owner_id.
alter table companies enable row level security;
alter table roles enable row level security;
alter table contacts enable row level security;
alter table interactions enable row level security;
alter table resume_versions enable row level security;
alter table applications enable row level security;
alter table facts enable row level security;

create policy "Owner can manage own companies" on companies
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Owner can manage own roles" on roles
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Owner can manage own contacts" on contacts
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Owner can manage own interactions" on interactions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Owner can manage own resume_versions" on resume_versions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Owner can manage own applications" on applications
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Owner can manage own facts" on facts
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
