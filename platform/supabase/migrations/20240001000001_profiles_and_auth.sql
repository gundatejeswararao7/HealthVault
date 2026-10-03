-- =============================================================
-- Migration: 20240001000001_profiles_and_auth.sql
-- Purpose  : Core profiles table linking Supabase Auth users to
--            platform roles and identities.
-- =============================================================

create table public.profiles (
  id                  uuid        primary key default uuid_generate_v4(),
  auth_uid            uuid        unique not null references auth.users(id) on delete cascade,
  role                text        not null check (role in ('patient','family_member','provider','admin','insurer')),
  -- For family_member profiles: points to the primary patient's profile.id
  primary_patient_id  uuid        references public.profiles(id),
  -- For provider profiles: the hospital branch they belong to
  branch_id           uuid,
  id_verified         boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── Row-Level Security ──────────────────────────────────────
alter table public.profiles enable row level security;

-- Every authenticated user can read their own profile row.
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth_uid = auth.uid());

-- Every authenticated user can update their own profile row.
-- Role changes are enforced at the API layer; RLS only gates the row.
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth_uid = auth.uid());

-- Admins and insurers can read any profile (e.g. for review workflows).
create policy "profiles_select_admin"
  on public.profiles
  for select
  using (
    exists (
      select 1
      from   public.profiles p
      where  p.auth_uid = auth.uid()
        and  p.role in ('admin', 'insurer')
    )
  );

-- ── Trigger: auto-update updated_at ────────────────────────
-- The function is created here so it can be reused by every
-- table that needs updated_at maintenance.
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer          -- runs as the function owner, not the caller
set search_path = public  -- explicit search_path to prevent search-path injection
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();
