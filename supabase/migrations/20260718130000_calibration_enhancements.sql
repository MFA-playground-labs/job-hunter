alter table calibrations
  add column excluded_domains text[] not null default '{}',
  add column location_policy text not null default 'remote_preferred'
    check (location_policy in ('remote_only', 'remote_preferred', 'nyc_or_remote', 'flexible')),
  add column comp_structure_note text;
