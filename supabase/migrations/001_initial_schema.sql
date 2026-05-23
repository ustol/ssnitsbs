-- ============================================================
-- SBS React — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  avatar_url text,
  role       text not null default 'viewer' check (role in ('admin','manager','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- STATUS LOOKUP
-- ============================================================
create table public.status_lookup (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  color      text not null default '#6c757d',
  sort_order int  not null default 0
);

insert into public.status_lookup (name, color, sort_order) values
  ('In Progress', '#0d6efd', 1),
  ('Active',      '#198754', 2),
  ('On Hold',     '#ffc107', 3),
  ('Completed',   '#6f42c1', 4),
  ('Pending',     '#fd7e14', 5),
  ('Cancelled',   '#dc3545', 6);

-- ============================================================
-- EXTERNAL STAKEHOLDERS
-- ============================================================
create table public.external_stakeholders (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  title        text,
  organization text,
  email        text,
  phone        text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- INTERNAL STAKEHOLDERS
-- ============================================================
create table public.internal_stakeholders (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  title      text,
  department text,
  email      text,
  phone      text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PARTNERSHIPS
-- ============================================================
create table public.partnerships (
  id             uuid primary key default uuid_generate_v4(),
  title          text not null,
  organization   text,
  description    text,
  status_id      uuid references public.status_lookup(id),
  proposed_value numeric(18,2),
  start_date     date,
  end_date       date,
  notes          text,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ============================================================
-- PARTNERSHIP + EXTERNAL STAKEHOLDERS (many-to-many)
-- ============================================================
create table public.partnership_external_stakeholders (
  partnership_id uuid not null references public.partnerships(id) on delete cascade,
  stakeholder_id uuid not null references public.external_stakeholders(id) on delete cascade,
  primary key (partnership_id, stakeholder_id)
);

-- ============================================================
-- EXTERNAL MEETINGS
-- ============================================================
create table public.external_meetings (
  id                 uuid primary key default uuid_generate_v4(),
  title              text not null,
  partnership_id     uuid references public.partnerships(id) on delete set null,
  meeting_date       date,
  location           text,
  attendees_external text,
  agenda             text,
  minutes            text,
  action_points      text,
  status_id          uuid references public.status_lookup(id),
  created_by         uuid references public.profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ============================================================
-- MEETING ATTACHMENTS
-- ============================================================
create table public.meeting_attachments (
  id           uuid primary key default uuid_generate_v4(),
  meeting_id   uuid not null,
  meeting_type text not null check (meeting_type in ('external','internal')),
  file_name    text not null,
  file_path    text not null,
  file_size    bigint,
  uploaded_by  uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

-- ============================================================
-- INTERNAL MEETINGS
-- ============================================================
create table public.internal_meetings (
  id             uuid primary key default uuid_generate_v4(),
  title          text not null,
  partnership_id uuid references public.partnerships(id) on delete set null,
  meeting_date   date,
  location       text,
  agenda         text,
  minutes        text,
  action_points  text,
  status_id      uuid references public.status_lookup(id),
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ============================================================
-- INTERNAL MEETING SUBJECTS
-- ============================================================
create table public.internal_meeting_subjects (
  id         uuid primary key default uuid_generate_v4(),
  meeting_id uuid not null references public.internal_meetings(id) on delete cascade,
  subject    text not null,
  outcome    text
);

-- ============================================================
-- MEETING ATTENDEES
-- ============================================================
create table public.meeting_attendees (
  id           uuid primary key default uuid_generate_v4(),
  meeting_id   uuid not null,
  meeting_type text not null check (meeting_type in ('external','internal')),
  profile_id   uuid references public.profiles(id),
  name         text,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- DDG FEEDBACK
-- ============================================================
create table public.ddg_feedback (
  id             uuid primary key default uuid_generate_v4(),
  feedback_type  text not null,
  partnership_id uuid references public.partnerships(id) on delete set null,
  stakeholder_id uuid references public.external_stakeholders(id) on delete set null,
  received_date  date,
  summary        text not null,
  details        text,
  action_taken   text,
  is_actioned    boolean not null default false,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table public.documents (
  id             uuid primary key default uuid_generate_v4(),
  title          text not null,
  partnership_id uuid references public.partnerships(id) on delete set null,
  file_path      text not null,
  file_size      bigint,
  file_type      text,
  uploaded_by    uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
create table public.system_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

insert into public.system_settings (key, value) values
  ('best_case_pct',  '60'),
  ('worst_case_pct', '30');

-- ============================================================
-- AUDIT LOG
-- ============================================================
create table public.audit_log (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.profiles(id),
  action     text not null,
  table_name text,
  record_id  uuid,
  details    jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('documents',   'documents',   false),
  ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles                           enable row level security;
alter table public.status_lookup                      enable row level security;
alter table public.external_stakeholders              enable row level security;
alter table public.internal_stakeholders              enable row level security;
alter table public.partnerships                       enable row level security;
alter table public.partnership_external_stakeholders  enable row level security;
alter table public.external_meetings                  enable row level security;
alter table public.meeting_attachments                enable row level security;
alter table public.internal_meetings                  enable row level security;
alter table public.internal_meeting_subjects          enable row level security;
alter table public.meeting_attendees                  enable row level security;
alter table public.ddg_feedback                       enable row level security;
alter table public.documents                          enable row level security;
alter table public.system_settings                    enable row level security;
alter table public.audit_log                          enable row level security;

create policy "Auth full access" on public.profiles                           for all to authenticated using (true) with check (true);
create policy "Auth full access" on public.status_lookup                      for all to authenticated using (true) with check (true);
create policy "Auth full access" on public.external_stakeholders              for all to authenticated using (true) with check (true);
create policy "Auth full access" on public.internal_stakeholders              for all to authenticated using (true) with check (true);
create policy "Auth full access" on public.partnerships                       for all to authenticated using (true) with check (true);
create policy "Auth full access" on public.partnership_external_stakeholders  for all to authenticated using (true) with check (true);
create policy "Auth full access" on public.external_meetings                  for all to authenticated using (true) with check (true);
create policy "Auth full access" on public.meeting_attachments                for all to authenticated using (true) with check (true);
create policy "Auth full access" on public.internal_meetings                  for all to authenticated using (true) with check (true);
create policy "Auth full access" on public.internal_meeting_subjects          for all to authenticated using (true) with check (true);
create policy "Auth full access" on public.meeting_attendees                  for all to authenticated using (true) with check (true);
create policy "Auth full access" on public.ddg_feedback                       for all to authenticated using (true) with check (true);
create policy "Auth full access" on public.documents                          for all to authenticated using (true) with check (true);
create policy "Auth full access" on public.system_settings                    for all to authenticated using (true) with check (true);
create policy "Auth full access" on public.audit_log                          for all to authenticated using (true) with check (true);

create policy "Auth storage access" on storage.objects
  for all to authenticated
  using (bucket_id in ('documents','attachments'))
  with check (bucket_id in ('documents','attachments'));

-- ============================================================
-- UPDATED_AT trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_updated_at before update on public.profiles                 for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.external_stakeholders    for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.internal_stakeholders    for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.partnerships             for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.external_meetings        for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.internal_meetings        for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.ddg_feedback             for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.documents                for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.system_settings          for each row execute procedure public.set_updated_at();
