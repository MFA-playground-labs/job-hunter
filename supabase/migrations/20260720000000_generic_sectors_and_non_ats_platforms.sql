-- Generic sector/company_type classification, decoupled from tier/ats logic, so scans
-- can span any industry (big tech, AI, fintech, etc.) not just startup ATS boards.
alter table companies
  add column sector text,
  add column company_type text;

create index idx_companies_sector on companies(sector);
create index idx_companies_company_type on companies(company_type);

-- Workday and fully-custom career sites are common outside the startup ATS trio;
-- track them explicitly instead of forcing ats_type/source to null or 'manual'.
alter table companies drop constraint companies_ats_type_check;
alter table companies add constraint companies_ats_type_check
  check (ats_type in ('greenhouse', 'ashby', 'lever', 'workday', 'custom'));

alter table jobs drop constraint jobs_source_check;
alter table jobs add constraint jobs_source_check
  check (source in ('greenhouse', 'ashby', 'lever', 'workday', 'custom', 'manual', 'funding_scan'));
