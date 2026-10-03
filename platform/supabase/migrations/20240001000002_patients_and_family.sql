-- =============================================================
-- Migration: 20240001000002_patients_and_family.sql
-- Purpose  : Patient demographic records and family-member
--            dependent management with admin approval workflow.
-- =============================================================

-- ── Patients ────────────────────────────────────────────────
create table public.patients (
  id              uuid    primary key default uuid_generate_v4(),
  profile_id      uuid    unique not null references public.profiles(id) on delete cascade,
  full_name       text    not null,
  date_of_birth   date    not null,
  gender          text    not null check (gender in ('male','female','other')),
  phone           text    not null,
  email           text    not null unique,
  address         text    not null,
  created_at      timestamptz not null default now()
);

alter table public.patients enable row level security;

-- Patient can read their own record.
create policy "patients_select_own"
  on public.patients
  for select
  using (profile_id = (select id from public.profiles where auth_uid = auth.uid()));

-- A family member linked to this patient can also read it.
create policy "patients_select_family"
  on public.patients
  for select
  using (
    profile_id in (
      select p.id
      from   public.profiles p
      join   public.profiles me on me.primary_patient_id = p.id
      where  me.auth_uid = auth.uid()
    )
  );

-- Providers, admins, and insurers can read any patient.
create policy "patients_select_provider"
  on public.patients
  for select
  using (
    exists (
      select 1
      from   public.profiles pr
      where  pr.auth_uid = auth.uid()
        and  pr.role in ('provider', 'admin', 'insurer')
    )
  );

-- A user can insert their own patient record (during onboarding).
create policy "patients_insert_own"
  on public.patients
  for insert
  with check (profile_id = (select id from public.profiles where auth_uid = auth.uid()));

-- A patient can update their own record.
create policy "patients_update_own"
  on public.patients
  for update
  using (profile_id = (select id from public.profiles where auth_uid = auth.uid()));


-- ── Family Members ──────────────────────────────────────────
create table public.family_members (
  id                    uuid        primary key default uuid_generate_v4(),
  primary_patient_id    uuid        not null references public.patients(id) on delete cascade,
  -- Set once the family member's own account is created and approved.
  profile_id            uuid        references public.profiles(id),
  full_name             text        not null,
  relationship          text        not null,
  date_of_birth         date        not null,
  status                text        not null default 'pending'
                          check (status in ('pending','approved','rejected','under_review')),
  reviewer_id           uuid        references public.profiles(id),
  decision_reason       text,
  reviewed_at           timestamptz,
  created_at            timestamptz not null default now()
);

alter table public.family_members enable row level security;

-- Primary patient can read their own dependents.
create policy "family_members_select_primary"
  on public.family_members
  for select
  using (
    primary_patient_id in (
      select pa.id
      from   public.patients pa
      join   public.profiles pr on pr.id = pa.profile_id
      where  pr.auth_uid = auth.uid()
    )
  );

-- Admins and insurers can see all pending/reviewed records.
create policy "family_members_select_admin"
  on public.family_members
  for select
  using (
    exists (
      select 1
      from   public.profiles
      where  auth_uid = auth.uid()
        and  role in ('admin', 'insurer')
    )
  );

-- Primary patient can submit a new family-member request.
create policy "family_members_insert_primary"
  on public.family_members
  for insert
  with check (
    primary_patient_id in (
      select pa.id
      from   public.patients pa
      join   public.profiles pr on pr.id = pa.profile_id
      where  pr.auth_uid = auth.uid()
    )
  );

-- Only admins / insurers can update (approve / reject) family-member requests.
create policy "family_members_update_admin"
  on public.family_members
  for update
  using (
    exists (
      select 1
      from   public.profiles
      where  auth_uid = auth.uid()
        and  role in ('admin', 'insurer')
    )
  );
