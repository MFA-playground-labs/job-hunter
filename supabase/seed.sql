-- Dev seed data. Auto-applied by `supabase db reset` against local Supabase.
--
-- owner_id is a foreign key to auth.users(id), so this can't run until:
--   1. Local Supabase is running (`supabase start`, needs Docker), and
--   2. A dev user exists (sign up once via the app or Supabase Studio), and
--   3. DEV_OWNER_ID below is replaced with that user's real auth.users id.
--
-- Row 1 is real: pulled from actual Gmail threads with Vialto (June 2026)
-- rather than invented, since no marc-facts.md / pipeline export was
-- available to seed from. Contact names are redacted to generic roles
-- before committing, since this repo is public. Row 2 is a placeholder so
-- the Kanban board has more than one stage represented — replace with a
-- real target company.

do $$
declare
  dev_owner_id uuid := '11111111-1111-1111-1111-111111111111'; -- TODO replace with your auth.users id
  vialto_company_id uuid := 'a0000000-0000-0000-0000-000000000001';
  vialto_role_id uuid := 'a0000000-0000-0000-0000-000000000002';
  hiring_manager_contact_id uuid := 'a0000000-0000-0000-0000-000000000003';
  referral_contact_id uuid := 'a0000000-0000-0000-0000-000000000004';
  placeholder_company_id uuid := 'b0000000-0000-0000-0000-000000000001';
  placeholder_role_id uuid := 'b0000000-0000-0000-0000-000000000002';
begin

  insert into companies (id, owner_id, name, notes)
  values (
    vialto_company_id, dev_owner_id, 'Vialto',
    'PM org building AI-native document intelligence tooling.'
  )
  on conflict (id) do nothing;

  insert into roles (id, owner_id, company_id, title, status)
  values (
    vialto_role_id, dev_owner_id, vialto_company_id,
    'Senior Product Manager - Vialto Intelligence', 'Interviewing'
  )
  on conflict (id) do nothing;

  insert into contacts (id, owner_id, company_id, name, last_contact_date)
  values
    (hiring_manager_contact_id, dev_owner_id, vialto_company_id, 'Hiring Manager', '2026-06-15'),
    (referral_contact_id, dev_owner_id, vialto_company_id, 'Referral Contact', '2026-06-24')
  on conflict (id) do nothing;

  insert into interactions (owner_id, contact_id, type, date, notes)
  values
    (
      dev_owner_id, referral_contact_id, 'email', '2026-06-04',
      'Sent resume and a link to the travel-app demo for feedback.'
    ),
    (
      dev_owner_id, hiring_manager_contact_id, 'email', '2026-06-15',
      'Thank-you note after the Vialto Intelligence interview; discussed AI-native '
      || 'document cataloguing and how it mirrors the travel app''s ingestion/normalization layer.'
    ),
    (
      dev_owner_id, referral_contact_id, 'email', '2026-06-24',
      'Sent case study and slides deck (Atlas Vialto Flow demo).'
    )
  on conflict do nothing;

  insert into applications (owner_id, role_id, stage, next_action)
  values (
    dev_owner_id, vialto_role_id, 'interviewing',
    'Follow up on next interview round'
  )
  on conflict do nothing;

  -- Placeholder row for Kanban variety.
  insert into companies (id, owner_id, name, notes)
  values (
    placeholder_company_id, dev_owner_id, 'Example Co',
    'Placeholder dev fixture -- replace with a real target company.'
  )
  on conflict (id) do nothing;

  insert into roles (id, owner_id, company_id, title, status)
  values (
    placeholder_role_id, dev_owner_id, placeholder_company_id,
    'Placeholder Role', 'Discovered'
  )
  on conflict (id) do nothing;

  insert into applications (owner_id, role_id, stage)
  values (dev_owner_id, placeholder_role_id, 'discovered')
  on conflict do nothing;

end $$;
