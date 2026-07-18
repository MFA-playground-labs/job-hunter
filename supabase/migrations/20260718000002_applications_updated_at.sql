-- The dashboard needs to detect "stale applications (no movement in 10+
-- days)" per frontend-builder.md. The initial schema had no column to
-- measure that against, so adding one here rather than faking staleness off
-- next_action_date. Auto-maintained via trigger so application code never
-- has to remember to touch it.

alter table applications add column updated_at timestamptz not null default now();

create index idx_applications_updated_at on applications(updated_at);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger applications_set_updated_at
  before update on applications
  for each row
  execute function set_updated_at();
