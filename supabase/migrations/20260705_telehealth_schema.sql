-- ============================================================
-- SSNIT–Trust Hospital Telehealth Reporting System
-- Migration: 20260705_telehealth_schema.sql
-- ============================================================

-- uuid-ossp may already exist from the initial schema; safe to re-run
create extension if not exists "uuid-ossp";

-- ============================================================
-- SEQUENCE for TTH-XXXX entry IDs
-- ============================================================
create sequence if not exists public.telehealth_entry_seq start 1;

-- ============================================================
-- REFERENCE TABLES
-- ============================================================

create table if not exists public.tele_reporting_periods (
  id         uuid primary key default uuid_generate_v4(),
  value      text not null unique,
  sort_order int  not null default 0
);

create table if not exists public.tele_weekly_cycles (
  id         uuid primary key default uuid_generate_v4(),
  value      text not null unique,
  sort_order int  not null default 0
);

create table if not exists public.tele_engagement_types (
  id         uuid primary key default uuid_generate_v4(),
  value      text not null unique,
  sort_order int  not null default 0
);

create table if not exists public.tele_digital_channels (
  id         uuid primary key default uuid_generate_v4(),
  value      text not null unique,
  sort_order int  not null default 0
);

create table if not exists public.tele_feedback_categories (
  id         uuid primary key default uuid_generate_v4(),
  value      text not null unique,
  sort_order int  not null default 0
);

create table if not exists public.tele_priority_levels (
  id         uuid primary key default uuid_generate_v4(),
  value      text not null unique,
  sort_order int  not null default 0
);

create table if not exists public.tele_statuses (
  id         uuid primary key default uuid_generate_v4(),
  value      text not null unique,
  sort_order int  not null default 0
);

create table if not exists public.tele_regions (
  id         uuid primary key default uuid_generate_v4(),
  value      text not null unique,
  sort_order int  not null default 0
);

create table if not exists public.tele_responsible_units (
  id         uuid primary key default uuid_generate_v4(),
  value      text not null unique,
  sort_order int  not null default 0
);

-- ============================================================
-- SEED REFERENCE DATA
-- ============================================================

insert into public.tele_reporting_periods (value, sort_order) values
  ('Jan 2026',  1), ('Feb 2026',  2), ('Mar 2026',  3),
  ('Apr 2026',  4), ('May 2026',  5), ('Jun 2026',  6),
  ('Jul 2026',  7), ('Aug 2026',  8), ('Sep 2026',  9),
  ('Oct 2026', 10), ('Nov 2026', 11), ('Dec 2026', 12)
on conflict (value) do nothing;

insert into public.tele_weekly_cycles (value, sort_order) values
  ('Week 1', 1), ('Week 2', 2), ('Week 3', 3), ('Week 4', 4), ('Week 5', 5)
on conflict (value) do nothing;

insert into public.tele_engagement_types (value, sort_order) values
  ('Appointment Reminder Call', 1),
  ('SMS Reminder',              2),
  ('Follow-Up Call',            3),
  ('Recovery Monitoring',       4),
  ('Enquiries',                 5),
  ('Feedback Collection',       6),
  ('Complaint Resolution',      7),
  ('Other',                     8)
on conflict (value) do nothing;

insert into public.tele_digital_channels (value, sort_order) values
  ('Phone Call', 1), ('SMS', 2)
on conflict (value) do nothing;

insert into public.tele_feedback_categories (value, sort_order) values
  ('Positive',   1), ('Complaint', 2), ('Suggestion', 3), ('Neutral', 4)
on conflict (value) do nothing;

insert into public.tele_priority_levels (value, sort_order) values
  ('High', 1), ('Medium', 2), ('Low', 3)
on conflict (value) do nothing;

insert into public.tele_statuses (value, sort_order) values
  ('Open', 1), ('In Progress', 2), ('Closed', 3)
on conflict (value) do nothing;

insert into public.tele_regions (value, sort_order) values
  ('Ahafo',        1),  ('Ashanti',      2),  ('Bono',        3),
  ('Bono East',    4),  ('Central',      5),  ('Eastern',     6),
  ('Northern',     7),  ('North East',   8),  ('Oti',         9),
  ('Savannah',    10),  ('Upper East',  11),  ('Upper West',  12),
  ('Volta',       13),  ('Western',     14),  ('Western North', 15)
on conflict (value) do nothing;

insert into public.tele_responsible_units (value, sort_order) values
  ('Telehealth Unit',  1),
  ('Call Centre',      2),
  ('Clinical Team',    3),
  ('IT / Digital',     4),
  ('Patient Relations',5),
  ('Pharmacy',         6),
  ('Records / Data',   7)
on conflict (value) do nothing;

-- ============================================================
-- MAIN TABLE: telehealth_entries
-- ============================================================

create table if not exists public.telehealth_entries (
  id                          uuid        primary key default uuid_generate_v4(),
  entry_id                    text        unique,                        -- TTH-0001 (trigger)

  -- Reporting context
  reporting_period            text        not null,
  weekly_cycle                text        not null,
  date_of_interaction         date        not null,
  cro_name                    text        not null,

  -- Patient details
  patient_full_name           text        not null,
  telephone_number            text,
  alternative_contact_number  text,
  email_address               text,
  physical_location           text,
  region                      text        not null,

  -- Engagement
  engagement_type             text        not null,
  digital_channel_used        text,

  -- Feedback
  feedback_category           text        not null,
  positive_feedback           text,                                      -- computed
  complaint                   text,                                      -- computed
  suggestion                  text,                                      -- computed
  detailed_feedback_narrative text,

  -- Outcomes
  successful_contact          text,
  issue_resolved              text,
  escalation_required         text,

  -- Observations & recommendations
  key_observation             text,
  root_cause                  text,
  emerging_trend              text,
  recommendation              text,
  priority_level              text,
  responsible_unit            text,
  status                      text        not null default 'Open',

  -- Computed classification
  quarter                     text,                                      -- Q1/Q2/Q3/Q4 (trigger)
  duplicate_flag              text,                                      -- DUPLICATE (trigger)
  contact_missing             text,                                      -- MISSING CONTACT (trigger)
  phone_check                 text,                                      -- CHECK NUMBER (trigger)

  -- Sort keys
  recommendation_sort_key     integer     default 0,
  observation_sort_key        integer     default 0,
  risk_sort_key               integer     default 0,
  opportunity_sort_key        integer     default 0,

  -- Audit (stored as plain uuid; FK added below only if profiles exists)
  created_by                  uuid,
  updated_by                  uuid,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- Add FK to profiles only when the table already exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
    if not exists (
      select 1 from information_schema.table_constraints
      where constraint_name = 'telehealth_entries_created_by_fkey'
    ) then
      alter table public.telehealth_entries
        add constraint telehealth_entries_created_by_fkey
        foreign key (created_by) references public.profiles(id) on delete set null;
    end if;
    if not exists (
      select 1 from information_schema.table_constraints
      where constraint_name = 'telehealth_entries_updated_by_fkey'
    ) then
      alter table public.telehealth_entries
        add constraint telehealth_entries_updated_by_fkey
        foreign key (updated_by) references public.profiles(id) on delete set null;
    end if;
  end if;
end
$$;

-- Index for common filter patterns
create index if not exists idx_tele_entries_period_cycle
  on public.telehealth_entries(reporting_period, weekly_cycle);

create index if not exists idx_tele_entries_date
  on public.telehealth_entries(date_of_interaction);

create index if not exists idx_tele_entries_region
  on public.telehealth_entries(region);

create index if not exists idx_tele_entries_status
  on public.telehealth_entries(status);

create index if not exists idx_tele_entries_quarter
  on public.telehealth_entries(quarter);

-- ============================================================
-- TRIGGER: Generate entry_id (TTH-0001 format)
-- ============================================================

create or replace function public.set_telehealth_entry_id()
returns trigger language plpgsql as $$
begin
  if new.entry_id is null then
    new.entry_id := 'TTH-' || lpad(nextval('public.telehealth_entry_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_telehealth_entry_id on public.telehealth_entries;
create trigger trg_set_telehealth_entry_id
  before insert on public.telehealth_entries
  for each row execute function public.set_telehealth_entry_id();

-- ============================================================
-- TRIGGER: Compute derived fields
-- ============================================================

create or replace function public.compute_telehealth_fields()
returns trigger language plpgsql as $$
declare
  month_num    int;
  clean_phone  text;
  dup_count    int;
begin
  -- Quarter from date
  month_num := extract(month from new.date_of_interaction);
  new.quarter := case
    when month_num between 1 and 3 then 'Q1'
    when month_num between 4 and 6 then 'Q2'
    when month_num between 7 and 9 then 'Q3'
    else 'Q4'
  end;

  -- Feedback derivations
  new.positive_feedback := case when new.feedback_category = 'Positive'   then 'Yes' else 'No' end;
  new.complaint         := case when new.feedback_category = 'Complaint'  then 'Yes' else 'No' end;
  new.suggestion        := case when new.feedback_category = 'Suggestion' then 'Yes' else 'No' end;

  -- Contact missing
  if (coalesce(trim(new.telephone_number), '')           = '' and
      coalesce(trim(new.alternative_contact_number), '') = '' and
      coalesce(trim(new.email_address), '')              = '') then
    new.contact_missing := 'MISSING CONTACT';
  else
    new.contact_missing := null;
  end if;

  -- Phone check (clean to digits, must be >= 10)
  clean_phone := regexp_replace(coalesce(new.telephone_number, ''), '[^0-9]', '', 'g');
  if length(clean_phone) > 0 and length(clean_phone) < 10 then
    new.phone_check := 'CHECK NUMBER';
  else
    new.phone_check := null;
  end if;

  -- Duplicate flag (same name + phone exists in another record)
  -- new.id is always set by the time this BEFORE trigger fires
  if coalesce(trim(new.telephone_number), '') != '' then
    select count(*) into dup_count
    from public.telehealth_entries
    where lower(trim(patient_full_name)) = lower(trim(new.patient_full_name))
      and telephone_number               = new.telephone_number
      and id                             != new.id;
    new.duplicate_flag := case when dup_count > 0 then 'DUPLICATE' else null end;
  else
    new.duplicate_flag := null;
  end if;

  -- Recommendation sort key: High=3, Medium=2, Low=1, none=0
  new.recommendation_sort_key := case new.priority_level
    when 'High'   then 3
    when 'Medium' then 2
    when 'Low'    then 1
    else 0
  end;

  -- Risk sort key: 1 if escalation=Yes OR priority=High
  new.risk_sort_key := case
    when new.escalation_required = 'Yes' or new.priority_level = 'High' then 1
    else 0
  end;

  -- Opportunity sort key: 1 if suggestion=Yes OR emerging_trend not null
  new.opportunity_sort_key := case
    when new.suggestion = 'Yes' or coalesce(trim(new.emerging_trend), '') != '' then 1
    else 0
  end;

  -- Observation sort key: 1 if key_observation not null
  new.observation_sort_key := case
    when coalesce(trim(new.key_observation), '') != '' then 1
    else 0
  end;

  return new;
end;
$$;

drop trigger if exists trg_compute_telehealth_fields on public.telehealth_entries;
create trigger trg_compute_telehealth_fields
  before insert or update on public.telehealth_entries
  for each row execute function public.compute_telehealth_fields();

-- ============================================================
-- TRIGGER: updated_at (uses set_updated_at() from initial schema;
--          define a local fallback so this migration runs standalone)
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_updated_at on public.telehealth_entries;
create trigger set_updated_at
  before update on public.telehealth_entries
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.telehealth_entries      enable row level security;
alter table public.tele_reporting_periods  enable row level security;
alter table public.tele_weekly_cycles      enable row level security;
alter table public.tele_engagement_types   enable row level security;
alter table public.tele_digital_channels   enable row level security;
alter table public.tele_feedback_categories enable row level security;
alter table public.tele_priority_levels    enable row level security;
alter table public.tele_statuses           enable row level security;
alter table public.tele_regions            enable row level security;
alter table public.tele_responsible_units  enable row level security;

-- All authenticated users can read and write telehealth entries
-- (application layer enforces SSNIT = read-only via role check)
create policy "Authenticated full access" on public.telehealth_entries
  for all to authenticated using (true) with check (true);

-- All authenticated users can read reference lists
create policy "Authenticated read" on public.tele_reporting_periods
  for select to authenticated using (true);
create policy "Authenticated write" on public.tele_reporting_periods
  for all to authenticated using (true) with check (true);

create policy "Authenticated read" on public.tele_weekly_cycles
  for select to authenticated using (true);
create policy "Authenticated write" on public.tele_weekly_cycles
  for all to authenticated using (true) with check (true);

create policy "Authenticated read" on public.tele_engagement_types
  for select to authenticated using (true);
create policy "Authenticated write" on public.tele_engagement_types
  for all to authenticated using (true) with check (true);

create policy "Authenticated read" on public.tele_digital_channels
  for select to authenticated using (true);
create policy "Authenticated write" on public.tele_digital_channels
  for all to authenticated using (true) with check (true);

create policy "Authenticated read" on public.tele_feedback_categories
  for select to authenticated using (true);
create policy "Authenticated write" on public.tele_feedback_categories
  for all to authenticated using (true) with check (true);

create policy "Authenticated read" on public.tele_priority_levels
  for select to authenticated using (true);
create policy "Authenticated write" on public.tele_priority_levels
  for all to authenticated using (true) with check (true);

create policy "Authenticated read" on public.tele_statuses
  for select to authenticated using (true);
create policy "Authenticated write" on public.tele_statuses
  for all to authenticated using (true) with check (true);

create policy "Authenticated read" on public.tele_regions
  for select to authenticated using (true);
create policy "Authenticated write" on public.tele_regions
  for all to authenticated using (true) with check (true);

create policy "Authenticated read" on public.tele_responsible_units
  for select to authenticated using (true);
create policy "Authenticated write" on public.tele_responsible_units
  for all to authenticated using (true) with check (true);
