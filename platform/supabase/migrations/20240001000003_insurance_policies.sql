-- =============================================================
-- Migration: 20240001000003_insurance_policies.sql
-- Purpose  : Insurance policies held by patients.
--            Insurers and admins can view all; patients see only
--            their own (and their family's).
-- =============================================================

create table public.insurance_policies (
  id              uuid          primary key default uuid_generate_v4(),
  patient_id      uuid          not null references public.patients(id) on delete cascade,
  policy_number   text          not null unique,
  provider_name   text          not null,
  coverage_type   text          not null,
  coverage_limit  numeric(12,2) not null,
  deductible      numeric(12,2) not null default 0,
  premium         numeric(10,2) not null,
  start_date      date          not null,
  end_date        date          not null,
  is_active       boolean       not null default true,
  created_at      timestamptz   not null default now(),

  -- Business rule: end date must be strictly after start date.
  constraint policies_date_order check (end_date > start_date)
);

alter table public.insurance_policies enable row level security;

-- Patients can read their own policies, and family members can read
-- policies belonging to the patient they are linked to.
create policy "policies_select_own"
  on public.insurance_policies
  for select
  using (
    -- Own policy
    patient_id in (
      select pa.id
      from   public.patients pa
      join   public.profiles pr on pr.id = pa.profile_id
      where  pr.auth_uid = auth.uid()
    )
    or
    -- Family member viewing primary patient's policy
    patient_id in (
      select pa.id
      from   public.patients pa
      join   public.profiles pr on pr.id = pa.profile_id
      join   public.profiles me on me.primary_patient_id = pr.id
      where  me.auth_uid = auth.uid()
    )
  );

-- Insurers and admins can read all policies.
create policy "policies_select_insurer"
  on public.insurance_policies
  for select
  using (
    exists (
      select 1
      from   public.profiles
      where  auth_uid = auth.uid()
        and  role in ('insurer', 'admin')
    )
  );

-- Patients can insert their own policies (during onboarding / self-service).
-- The API layer additionally validates that policy_number is unique.
create policy "policies_insert_own"
  on public.insurance_policies
  for insert
  with check (
    patient_id in (
      select pa.id
      from   public.patients pa
      join   public.profiles pr on pr.id = pa.profile_id
      where  pr.auth_uid = auth.uid()
    )
  );

-- Patients can update their own policies (e.g. to deactivate is_active).
create policy "policies_update_own"
  on public.insurance_policies
  for update
  using (
    patient_id in (
      select pa.id
      from   public.patients pa
      join   public.profiles pr on pr.id = pa.profile_id
      where  pr.auth_uid = auth.uid()
    )
  );

-- Insurers and admins can update any policy (e.g. flag as inactive after expiry).
create policy "policies_update_insurer"
  on public.insurance_policies
  for update
  using (
    exists (
      select 1
      from   public.profiles
      where  auth_uid = auth.uid()
        and  role in ('insurer', 'admin')
    )
  );
