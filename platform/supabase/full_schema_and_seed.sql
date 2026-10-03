-- =====================================================================
-- COMPLETE SUPABASE SCHEMA & INITIAL SEED
-- Platform: Insurance / Healthcare Multi-App
-- Safe to run in Supabase Web Dashboard -> SQL Editor
-- =====================================================================


-- ---------------------------------------------------------------------
-- Migration: 20240001000000_extensions.sql
-- ---------------------------------------------------------------------

-- =============================================================
-- Migration: 20240001000000_extensions.sql
-- Purpose  : Enable PostgreSQL extensions required by the
--            Insurance/Healthcare Platform schema.
-- =============================================================

-- uuid_generate_v4() used as default PK generator throughout the schema.
create extension if not exists "uuid-ossp";

-- pgcrypto provides gen_random_bytes() and crypt() used for
-- any server-side hashing utilities and random token generation.
create extension if not exists "pgcrypto";


-- ---------------------------------------------------------------------
-- Migration: 20240001000001_profiles_and_auth.sql
-- ---------------------------------------------------------------------

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
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select
  using (auth_uid = auth.uid());

-- Every authenticated user can update their own profile row.
-- Role changes are enforced at the API layer; RLS only gates the row.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  using (auth_uid = auth.uid());

-- Admins and insurers can read any profile (e.g. for review workflows).
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
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


-- ---------------------------------------------------------------------
-- Migration: 20240001000002_patients_and_family.sql
-- ---------------------------------------------------------------------

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
drop policy if exists "patients_select_own" on public.patients;
create policy "patients_select_own" on public.patients
  for select
  using (profile_id = (select id from public.profiles where auth_uid = auth.uid()));

-- A family member linked to this patient can also read it.
drop policy if exists "patients_select_family" on public.patients;
create policy "patients_select_family" on public.patients
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
drop policy if exists "patients_select_provider" on public.patients;
create policy "patients_select_provider" on public.patients
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
drop policy if exists "patients_insert_own" on public.patients;
create policy "patients_insert_own" on public.patients
  for insert
  with check (profile_id = (select id from public.profiles where auth_uid = auth.uid()));

-- A patient can update their own record.
drop policy if exists "patients_update_own" on public.patients;
create policy "patients_update_own" on public.patients
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
drop policy if exists "family_members_select_primary" on public.family_members;
create policy "family_members_select_primary" on public.family_members
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
drop policy if exists "family_members_select_admin" on public.family_members;
create policy "family_members_select_admin" on public.family_members
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
drop policy if exists "family_members_insert_primary" on public.family_members;
create policy "family_members_insert_primary" on public.family_members
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
drop policy if exists "family_members_update_admin" on public.family_members;
create policy "family_members_update_admin" on public.family_members
  for update
  using (
    exists (
      select 1
      from   public.profiles
      where  auth_uid = auth.uid()
        and  role in ('admin', 'insurer')
    )
  );


-- ---------------------------------------------------------------------
-- Migration: 20240001000003_insurance_policies.sql
-- ---------------------------------------------------------------------

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
drop policy if exists "policies_select_own" on public.insurance_policies;
create policy "policies_select_own" on public.insurance_policies
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
drop policy if exists "policies_select_insurer" on public.insurance_policies;
create policy "policies_select_insurer" on public.insurance_policies
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
drop policy if exists "policies_insert_own" on public.insurance_policies;
create policy "policies_insert_own" on public.insurance_policies
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
drop policy if exists "policies_update_own" on public.insurance_policies;
create policy "policies_update_own" on public.insurance_policies
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
drop policy if exists "policies_update_insurer" on public.insurance_policies;
create policy "policies_update_insurer" on public.insurance_policies
  for update
  using (
    exists (
      select 1
      from   public.profiles
      where  auth_uid = auth.uid()
        and  role in ('insurer', 'admin')
    )
  );


-- ---------------------------------------------------------------------
-- Migration: 20240001000004_hospitals_and_users.sql
-- ---------------------------------------------------------------------

-- =============================================================
-- Migration: 20240001000004_hospitals_and_users.sql
-- Purpose  : Hospital registry, branch-application review
--            workflow, and hospital ↔ provider staff mapping.
-- =============================================================

-- ── Hospitals ───────────────────────────────────────────────
create table public.hospitals (
  id               uuid        primary key default uuid_generate_v4(),
  name             text        not null,
  license_number   text        not null unique,
  address          text        not null,
  phone            text        not null,
  email            text        not null unique,
  status           text        not null default 'pending'
                     check (status in ('pending','active','rejected','suspended')),
  created_at       timestamptz not null default now()
);

alter table public.hospitals enable row level security;

-- Any authenticated user can browse the hospital directory.
drop policy if exists "hospitals_select_all_auth" on public.hospitals;
create policy "hospitals_select_all_auth" on public.hospitals
  for select
  using (auth.uid() is not null);

-- Only admins may register new hospitals.
drop policy if exists "hospitals_insert_admin" on public.hospitals;
create policy "hospitals_insert_admin" on public.hospitals
  for insert
  with check (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role = 'admin'
    )
  );

-- Only admins may update hospital status / details.
drop policy if exists "hospitals_update_admin" on public.hospitals;
create policy "hospitals_update_admin" on public.hospitals
  for update
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role = 'admin'
    )
  );


-- ── Hospital Branch Applications ────────────────────────────
-- A hospital or provider submits an application to open/activate a branch.
-- Admins / insurers review and approve or reject.
create table public.hospital_branch_applications (
  id                      uuid        primary key default uuid_generate_v4(),
  hospital_id             uuid        not null references public.hospitals(id) on delete cascade,
  submitted_by            uuid        not null references public.profiles(id),
  license_document_path   text        not null,
  additional_docs         text[]      not null default '{}',
  status                  text        not null default 'pending'
                            check (status in ('pending','approved','rejected','under_review')),
  reviewer_id             uuid        references public.profiles(id),
  decision_reason         text,
  reviewed_at             timestamptz,
  created_at              timestamptz not null default now()
);

alter table public.hospital_branch_applications enable row level security;

-- Submitters can read their own applications.
drop policy if exists "branch_apps_select_submitter" on public.hospital_branch_applications;
create policy "branch_apps_select_submitter" on public.hospital_branch_applications
  for select
  using (submitted_by = (select id from public.profiles where auth_uid = auth.uid()));

-- Admins and insurers can read all applications (review queue).
drop policy if exists "branch_apps_select_admin" on public.hospital_branch_applications;
create policy "branch_apps_select_admin" on public.hospital_branch_applications
  for select
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role in ('admin', 'insurer')
    )
  );

-- Authenticated users can submit applications on their own behalf.
drop policy if exists "branch_apps_insert" on public.hospital_branch_applications;
create policy "branch_apps_insert" on public.hospital_branch_applications
  for insert
  with check (submitted_by = (select id from public.profiles where auth_uid = auth.uid()));

-- Admins and insurers can update status / record decision.
drop policy if exists "branch_apps_update_admin" on public.hospital_branch_applications;
create policy "branch_apps_update_admin" on public.hospital_branch_applications
  for update
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role in ('admin', 'insurer')
    )
  );


-- ── Hospital Users (Staff) ──────────────────────────────────
-- Many-to-many between hospitals and provider profiles.
create table public.hospital_users (
  id           uuid        primary key default uuid_generate_v4(),
  hospital_id  uuid        not null references public.hospitals(id) on delete cascade,
  profile_id   uuid        not null references public.profiles(id) on delete cascade,
  designation  text        not null,
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  unique (hospital_id, profile_id)
);

alter table public.hospital_users enable row level security;

-- A provider can read their own staff record.
drop policy if exists "hospital_users_select_own" on public.hospital_users;
create policy "hospital_users_select_own" on public.hospital_users
  for select
  using (profile_id = (select id from public.profiles where auth_uid = auth.uid()));

-- Admins can read all hospital-user mappings.
drop policy if exists "hospital_users_select_admin" on public.hospital_users;
create policy "hospital_users_select_admin" on public.hospital_users
  for select
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role = 'admin'
    )
  );

-- Providers in the same hospital can see their colleagues.
drop policy if exists "hospital_users_select_same_hospital" on public.hospital_users;
create policy "hospital_users_select_same_hospital" on public.hospital_users
  for select
  using (
    hospital_id in (
      select hu.hospital_id
      from   public.hospital_users hu
      join   public.profiles pr on pr.id = hu.profile_id
      where  pr.auth_uid = auth.uid()
        and  hu.is_active = true
    )
  );

-- Only admins can add / update staff mappings.
drop policy if exists "hospital_users_insert_admin" on public.hospital_users;
create policy "hospital_users_insert_admin" on public.hospital_users
  for insert
  with check (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "hospital_users_update_admin" on public.hospital_users;
create policy "hospital_users_update_admin" on public.hospital_users
  for update
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role = 'admin'
    )
  );


-- ---------------------------------------------------------------------
-- Migration: 20240001000005_appointments_and_cases.sql
-- ---------------------------------------------------------------------

-- =============================================================
-- Migration: 20240001000005_appointments_and_cases.sql
-- Purpose  : Appointments (patient ↔ provider scheduling),
--            clinical Cases opened from appointments, and
--            individual TreatmentItems billed within a case.
-- =============================================================

-- ── Appointments ────────────────────────────────────────────
create table public.appointments (
  id                  uuid        primary key default uuid_generate_v4(),
  patient_id          uuid        not null references public.patients(id) on delete cascade,
  hospital_id         uuid        not null references public.hospitals(id),
  provider_profile_id uuid        not null references public.profiles(id),
  scheduled_at        timestamptz not null,
  reason              text        not null,
  status              text        not null default 'pending'
                        check (status in ('pending','confirmed','cancelled','completed')),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.appointments enable row level security;

create trigger appointments_updated_at
  before update on public.appointments
  for each row
  execute function public.handle_updated_at();

-- Patient sees their own appointments.
drop policy if exists "appointments_select_patient" on public.appointments;
create policy "appointments_select_patient" on public.appointments
  for select
  using (
    patient_id in (
      select pa.id
      from   public.patients pa
      join   public.profiles pr on pr.id = pa.profile_id
      where  pr.auth_uid = auth.uid()
    )
  );

-- Family member sees appointments for the patient they are linked to.
drop policy if exists "appointments_select_family" on public.appointments;
create policy "appointments_select_family" on public.appointments
  for select
  using (
    patient_id in (
      select pa.id
      from   public.patients pa
      join   public.profiles pr on pr.id = pa.profile_id
      join   public.profiles me on me.primary_patient_id = pr.id
      where  me.auth_uid = auth.uid()
    )
  );

-- Provider sees appointments they own, or any appointment at their hospital.
drop policy if exists "appointments_select_provider" on public.appointments;
create policy "appointments_select_provider" on public.appointments
  for select
  using (
    provider_profile_id = (select id from public.profiles where auth_uid = auth.uid())
    or hospital_id in (
      select hu.hospital_id
      from   public.hospital_users hu
      join   public.profiles pr on pr.id = hu.profile_id
      where  pr.auth_uid = auth.uid() and hu.is_active = true
    )
  );

-- Admins and insurers can read all appointments.
drop policy if exists "appointments_select_admin" on public.appointments;
create policy "appointments_select_admin" on public.appointments
  for select
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role in ('admin', 'insurer')
    )
  );

-- Patients book their own appointments.
drop policy if exists "appointments_insert_patient" on public.appointments;
create policy "appointments_insert_patient" on public.appointments
  for insert
  with check (
    patient_id in (
      select pa.id
      from   public.patients pa
      join   public.profiles pr on pr.id = pa.profile_id
      where  pr.auth_uid = auth.uid()
    )
  );

-- The assigned provider or an admin can update appointment status / notes.
drop policy if exists "appointments_update_provider" on public.appointments;
create policy "appointments_update_provider" on public.appointments
  for update
  using (
    provider_profile_id = (select id from public.profiles where auth_uid = auth.uid())
    or exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role = 'admin'
    )
  );


-- ── Cases ───────────────────────────────────────────────────
-- A clinical case is opened by a provider after an appointment.
create table public.cases (
  id               uuid        primary key default uuid_generate_v4(),
  appointment_id   uuid        not null references public.appointments(id),
  patient_id       uuid        not null references public.patients(id),
  hospital_id      uuid        not null references public.hospitals(id),
  diagnosis        text        not null,
  treatment_plan   text        not null,
  opened_at        timestamptz not null default now(),
  closed_at        timestamptz
);

alter table public.cases enable row level security;

-- Patient sees their own cases.
drop policy if exists "cases_select_patient" on public.cases;
create policy "cases_select_patient" on public.cases
  for select
  using (
    patient_id in (
      select pa.id
      from   public.patients pa
      join   public.profiles pr on pr.id = pa.profile_id
      where  pr.auth_uid = auth.uid()
    )
  );

-- Family member sees cases belonging to the patient they are linked to.
drop policy if exists "cases_select_family" on public.cases;
create policy "cases_select_family" on public.cases
  for select
  using (
    patient_id in (
      select pa.id
      from   public.patients pa
      join   public.profiles pr on pr.id = pa.profile_id
      join   public.profiles me on me.primary_patient_id = pr.id
      where  me.auth_uid = auth.uid()
    )
  );

-- Active hospital staff can see cases at their hospital.
drop policy if exists "cases_select_provider" on public.cases;
create policy "cases_select_provider" on public.cases
  for select
  using (
    hospital_id in (
      select hu.hospital_id
      from   public.hospital_users hu
      join   public.profiles pr on pr.id = hu.profile_id
      where  pr.auth_uid = auth.uid() and hu.is_active = true
    )
  );

-- Insurers and admins can read all cases.
drop policy if exists "cases_select_admin" on public.cases;
create policy "cases_select_admin" on public.cases
  for select
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role in ('admin', 'insurer')
    )
  );

-- Active hospital staff can open cases at their hospital.
drop policy if exists "cases_insert_provider" on public.cases;
create policy "cases_insert_provider" on public.cases
  for insert
  with check (
    hospital_id in (
      select hu.hospital_id
      from   public.hospital_users hu
      join   public.profiles pr on pr.id = hu.profile_id
      where  pr.auth_uid = auth.uid() and hu.is_active = true
    )
  );

-- Active hospital staff can update cases at their hospital (e.g. set closed_at).
drop policy if exists "cases_update_provider" on public.cases;
create policy "cases_update_provider" on public.cases
  for update
  using (
    hospital_id in (
      select hu.hospital_id
      from   public.hospital_users hu
      join   public.profiles pr on pr.id = hu.profile_id
      where  pr.auth_uid = auth.uid() and hu.is_active = true
    )
  );


-- ── Treatment Items ─────────────────────────────────────────
-- Itemised billing lines within a clinical case.
create table public.treatment_items (
  id           uuid          primary key default uuid_generate_v4(),
  case_id      uuid          not null references public.cases(id) on delete cascade,
  description  text          not null,
  quantity     integer       not null default 1 check (quantity > 0),
  unit_cost    numeric(10,2) not null check (unit_cost >= 0),
  -- Computed column: always equals quantity * unit_cost.
  total_cost   numeric(12,2) generated always as (quantity * unit_cost) stored,
  billed_at    timestamptz   not null default now()
);

alter table public.treatment_items enable row level security;

-- Patients can read billing lines for their own cases.
drop policy if exists "treatment_items_select_patient" on public.treatment_items;
create policy "treatment_items_select_patient" on public.treatment_items
  for select
  using (
    case_id in (
      select c.id
      from   public.cases c
      join   public.patients pa on pa.id = c.patient_id
      join   public.profiles pr on pr.id = pa.profile_id
      where  pr.auth_uid = auth.uid()
    )
  );

-- Active hospital staff can read billing lines for cases at their hospital.
drop policy if exists "treatment_items_select_provider" on public.treatment_items;
create policy "treatment_items_select_provider" on public.treatment_items
  for select
  using (
    case_id in (
      select c.id
      from   public.cases c
      join   public.hospital_users hu on hu.hospital_id = c.hospital_id
      join   public.profiles pr on pr.id = hu.profile_id
      where  pr.auth_uid = auth.uid() and hu.is_active = true
    )
  );

-- Active hospital staff can insert / update / delete billing lines
-- for cases at their hospital (consolidated ALL policy for write ops).
drop policy if exists "treatment_items_manage_provider" on public.treatment_items;
create policy "treatment_items_manage_provider" on public.treatment_items
  for all
  using (
    case_id in (
      select c.id
      from   public.cases c
      join   public.hospital_users hu on hu.hospital_id = c.hospital_id
      join   public.profiles pr on pr.id = hu.profile_id
      where  pr.auth_uid = auth.uid() and hu.is_active = true
    )
  );

-- Insurers and admins can read all treatment items (for claim validation).
drop policy if exists "treatment_items_select_admin" on public.treatment_items;
create policy "treatment_items_select_admin" on public.treatment_items
  for select
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role in ('admin', 'insurer')
    )
  );


-- ---------------------------------------------------------------------
-- Migration: 20240001000006_documents.sql
-- ---------------------------------------------------------------------

-- =============================================================
-- Migration: 20240001000006_documents.sql
-- Purpose  : Document metadata table for all uploaded files.
--            Actual binaries live in Supabase Storage; this
--            table stores path references and classification.
-- =============================================================

create table public.documents (
  id               uuid        primary key default uuid_generate_v4(),
  -- Profile that owns / uploaded this document.
  owner_id         uuid        not null references public.profiles(id) on delete cascade,
  -- Optional association with a clinical case.
  case_id          uuid        references public.cases(id),
  -- Optional association with a specific appointment.
  appointment_id   uuid        references public.appointments(id),
  document_type    text        not null
                     check (document_type in (
                       'lab_report',
                       'invoice',
                       'license',
                       'case_document',
                       'id_proof'
                     )),
  file_name        text        not null,
  -- Bucket-relative object path in Supabase Storage.
  storage_path     text        not null,
  mime_type        text        not null,
  size_bytes       bigint      not null check (size_bytes > 0),
  uploaded_at      timestamptz not null default now()
);

alter table public.documents enable row level security;

-- ── Select Policies ─────────────────────────────────────────

-- Owners can always read their own documents.
drop policy if exists "documents_select_owner" on public.documents;
create policy "documents_select_owner" on public.documents
  for select
  using (owner_id = (select id from public.profiles where auth_uid = auth.uid()));

-- Active hospital staff can read documents linked to cases at their hospital.
drop policy if exists "documents_select_provider_case" on public.documents;
create policy "documents_select_provider_case" on public.documents
  for select
  using (
    case_id in (
      select c.id
      from   public.cases c
      join   public.hospital_users hu on hu.hospital_id = c.hospital_id
      join   public.profiles pr on pr.id = hu.profile_id
      where  pr.auth_uid = auth.uid() and hu.is_active = true
    )
  );

-- Active hospital staff can read documents linked to appointments at their hospital.
drop policy if exists "documents_select_provider_appointment" on public.documents;
create policy "documents_select_provider_appointment" on public.documents
  for select
  using (
    appointment_id in (
      select a.id
      from   public.appointments a
      join   public.hospital_users hu on hu.hospital_id = a.hospital_id
      join   public.profiles pr on pr.id = hu.profile_id
      where  pr.auth_uid = auth.uid() and hu.is_active = true
    )
  );

-- Insurers and admins can read all documents (for claim adjudication).
drop policy if exists "documents_select_admin" on public.documents;
create policy "documents_select_admin" on public.documents
  for select
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role in ('admin', 'insurer')
    )
  );

-- ── Insert Policy ───────────────────────────────────────────

-- Any authenticated user can upload documents on their own behalf.
drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
  for insert
  with check (owner_id = (select id from public.profiles where auth_uid = auth.uid()));

-- ── Delete Policy ───────────────────────────────────────────

-- Owners can delete their own documents.
-- The API layer should also remove the Storage object before deleting the row.
drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own" on public.documents
  for delete
  using (owner_id = (select id from public.profiles where auth_uid = auth.uid()));


-- ---------------------------------------------------------------------
-- Migration: 20240001000007_claims.sql
-- ---------------------------------------------------------------------

-- =============================================================
-- Migration: 20240001000007_claims.sql
-- Purpose  : Insurance claims lifecycle — from patient draft
--            through insurer adjudication to payment.
-- =============================================================

create table public.claims (
  id               uuid          primary key default uuid_generate_v4(),
  patient_id       uuid          not null references public.patients(id) on delete cascade,
  policy_id        uuid          not null references public.insurance_policies(id),
  case_id          uuid          not null references public.cases(id),
  amount_claimed   numeric(12,2) not null check (amount_claimed > 0),
  -- Filled in by the insurer after adjudication.
  amount_approved  numeric(12,2) check (amount_approved >= 0),
  status           text          not null default 'draft'
                     check (status in (
                       'draft',
                       'submitted',
                       'under_review',
                       'approved',
                       'rejected',
                       'paid'
                     )),
  reviewer_id      uuid          references public.profiles(id),
  decision_reason  text,
  reviewed_at      timestamptz,
  -- Set by the API layer when patient submits a draft claim.
  submitted_at     timestamptz,
  created_at       timestamptz   not null default now()
);

alter table public.claims enable row level security;

-- ── Select Policies ─────────────────────────────────────────

-- Patients can read their own claims.
drop policy if exists "claims_select_patient" on public.claims;
create policy "claims_select_patient" on public.claims
  for select
  using (
    patient_id in (
      select pa.id
      from   public.patients pa
      join   public.profiles pr on pr.id = pa.profile_id
      where  pr.auth_uid = auth.uid()
    )
  );

-- Family members can read claims for the patient they are linked to.
drop policy if exists "claims_select_family" on public.claims;
create policy "claims_select_family" on public.claims
  for select
  using (
    patient_id in (
      select pa.id
      from   public.patients pa
      join   public.profiles pr on pr.id = pa.profile_id
      join   public.profiles me on me.primary_patient_id = pr.id
      where  me.auth_uid = auth.uid()
    )
  );

-- Insurers and admins can read all claims (adjudication queue).
drop policy if exists "claims_select_insurer" on public.claims;
create policy "claims_select_insurer" on public.claims
  for select
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role in ('insurer', 'admin')
    )
  );

-- ── Insert Policy ────────────────────────────────────────────

-- Patients can only create claims against their own patient record.
drop policy if exists "claims_insert_patient" on public.claims;
create policy "claims_insert_patient" on public.claims
  for insert
  with check (
    patient_id in (
      select pa.id
      from   public.patients pa
      join   public.profiles pr on pr.id = pa.profile_id
      where  pr.auth_uid = auth.uid()
    )
  );

-- ── Update Policies ─────────────────────────────────────────

-- Patients may only edit claims that are still in 'draft' status.
drop policy if exists "claims_update_patient_draft" on public.claims;
create policy "claims_update_patient_draft" on public.claims
  for update
  using (
    status = 'draft'
    and patient_id in (
      select pa.id
      from   public.patients pa
      join   public.profiles pr on pr.id = pa.profile_id
      where  pr.auth_uid = auth.uid()
    )
  );

-- Insurers and admins can update claims at any status (adjudication).
drop policy if exists "claims_update_insurer" on public.claims;
create policy "claims_update_insurer" on public.claims
  for update
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role in ('insurer', 'admin')
    )
  );


-- ---------------------------------------------------------------------
-- Migration: 20240001000008_notifications_and_audit.sql
-- ---------------------------------------------------------------------

-- Notifications Table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null,
  reference_id uuid,
  reference_table text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select
  using (recipient_id = (select id from public.profiles where auth_uid = auth.uid()));

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update
  using (recipient_id = (select id from public.profiles where auth_uid = auth.uid()));

drop policy if exists "notifications_insert_system" on public.notifications;
create policy "notifications_insert_system" on public.notifications for insert
  with check (true);

-- Audit Logs Table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid not null,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin" on public.audit_logs for select
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role = 'admin'));

drop policy if exists "audit_logs_insert_all" on public.audit_logs;
create policy "audit_logs_insert_all" on public.audit_logs for insert
  with check (true);


-- ---------------------------------------------------------------------
-- Initial Seed & Storage Buckets Setup
-- ---------------------------------------------------------------------

-- Seed Data for Insurance / Healthcare Platform
-- 1. Create Storage Buckets if not existing
insert into storage.buckets (id, name, public)
values
  ('lab-reports', 'lab-reports', false),
  ('invoices', 'invoices', false),
  ('licenses', 'licenses', true),
  ('case-documents', 'case-documents', false)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "lab_reports_access" on storage.objects;
create policy "lab_reports_access" on storage.objects for all using (
  bucket_id = 'lab-reports' and auth.role() = 'authenticated'
);

drop policy if exists "invoices_access" on storage.objects;
create policy "invoices_access" on storage.objects for all using (
  bucket_id = 'invoices' and auth.role() = 'authenticated'
);

drop policy if exists "licenses_access" on storage.objects;
create policy "licenses_access" on storage.objects for all using (
  bucket_id = 'licenses'
);

drop policy if exists "case_docs_access" on storage.objects;
create policy "case_docs_access" on storage.objects for all using (
  bucket_id = 'case-documents' and auth.role() = 'authenticated'
);

-- 2. Seed Sample Hospitals
insert into public.hospitals (id, name, license_number, address, phone, email, status)
values
  ('00000000-0000-0000-0000-000000000001', 'City General Hospital', 'LIC-NY-2024-001', '100 Medical Center Dr, New York, NY', '+1-212-555-0101', 'contact@citygeneral.org', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'St. Jude Specialty Clinic', 'LIC-CA-2024-042', '500 Health Way, Los Angeles, CA', '+1-310-555-0142', 'info@stjudeclinic.org', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'Metro Urgent Care - Downtown', 'LIC-IL-2024-088', '25 Michigan Ave, Chicago, IL', '+1-312-555-0188', 'onboarding@metrouniform.org', 'pending')
on conflict (id) do nothing;

