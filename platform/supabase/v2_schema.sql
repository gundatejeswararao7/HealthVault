-- ============================================================
-- HealthVault v2 — Full Schema (No Appointments, Insurance-First)
-- Run in Supabase SQL Editor
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- HELPER FUNCTION
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_uid uuid unique not null references auth.users(id) on delete cascade,
  role text not null check (role in ('patient','family_member','provider','admin','insurer')),
  primary_patient_id uuid references public.profiles(id),
  branch_id uuid,
  id_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth_uid = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth_uid = auth.uid());
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles for select using (
  exists (select 1 from public.profiles p where p.auth_uid = auth.uid() and p.role in ('admin','insurer'))
);
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ============================================================
-- PATIENTS
-- ============================================================
create table if not exists public.patients (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid unique not null references public.profiles(id) on delete cascade,
  full_name text not null,
  date_of_birth date not null,
  gender text not null check (gender in ('male','female','other')),
  phone text not null,
  email text not null unique,
  address text not null,
  created_at timestamptz not null default now()
);
alter table public.patients enable row level security;
drop policy if exists "patients_select_own" on public.patients;
create policy "patients_select_own" on public.patients for select
  using (profile_id = (select id from public.profiles where auth_uid = auth.uid()));
drop policy if exists "patients_insert_own" on public.patients;
create policy "patients_insert_own" on public.patients for insert
  with check (profile_id = (select id from public.profiles where auth_uid = auth.uid()));
drop policy if exists "patients_update_own" on public.patients;
create policy "patients_update_own" on public.patients for update
  using (profile_id = (select id from public.profiles where auth_uid = auth.uid()));
drop policy if exists "patients_select_provider" on public.patients;
create policy "patients_select_provider" on public.patients for select
  using (exists (select 1 from public.profiles pr where pr.auth_uid = auth.uid() and pr.role in ('provider','admin','insurer')));

-- ============================================================
-- FAMILY MEMBERS
-- ============================================================
create table if not exists public.family_members (
  id uuid primary key default uuid_generate_v4(),
  primary_patient_id uuid not null references public.patients(id) on delete cascade,
  profile_id uuid references public.profiles(id),
  full_name text not null,
  relationship text not null,
  date_of_birth date not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','under_review')),
  reviewer_id uuid references public.profiles(id),
  decision_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.family_members enable row level security;
drop policy if exists "family_members_select_primary" on public.family_members;
create policy "family_members_select_primary" on public.family_members for select
  using (primary_patient_id in (
    select pa.id from public.patients pa join public.profiles pr on pr.id = pa.profile_id where pr.auth_uid = auth.uid()
  ));
drop policy if exists "family_members_insert_primary" on public.family_members;
create policy "family_members_insert_primary" on public.family_members for insert
  with check (primary_patient_id in (
    select pa.id from public.patients pa join public.profiles pr on pr.id = pa.profile_id where pr.auth_uid = auth.uid()
  ));
drop policy if exists "family_members_select_admin" on public.family_members;
create policy "family_members_select_admin" on public.family_members for select
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('admin','insurer')));
drop policy if exists "family_members_update_admin" on public.family_members;
create policy "family_members_update_admin" on public.family_members for update
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('admin','insurer')));

-- ============================================================
-- HOSPITALS
-- ============================================================
create table if not exists public.hospitals (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  license_number text not null unique,
  address text not null,
  phone text not null,
  email text not null unique,
  status text not null default 'pending' check (status in ('pending','active','rejected','suspended')),
  created_at timestamptz not null default now()
);
alter table public.hospitals enable row level security;
drop policy if exists "hospitals_select_all_auth" on public.hospitals;
create policy "hospitals_select_all_auth" on public.hospitals for select using (auth.uid() is not null);
drop policy if exists "hospitals_insert_admin" on public.hospitals;
create policy "hospitals_insert_admin" on public.hospitals for insert
  with check (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('admin','insurer')));
drop policy if exists "hospitals_update_admin" on public.hospitals;
create policy "hospitals_update_admin" on public.hospitals for update
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('admin','insurer')));

-- ============================================================
-- HOSPITAL BRANCH APPLICATIONS
-- ============================================================
create table if not exists public.hospital_branch_applications (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id),
  license_document_path text not null,
  additional_docs text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected','under_review')),
  reviewer_id uuid references public.profiles(id),
  decision_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.hospital_branch_applications enable row level security;
drop policy if exists "branch_apps_select_submitter" on public.hospital_branch_applications;
create policy "branch_apps_select_submitter" on public.hospital_branch_applications for select
  using (submitted_by = (select id from public.profiles where auth_uid = auth.uid()));
drop policy if exists "branch_apps_select_admin" on public.hospital_branch_applications;
create policy "branch_apps_select_admin" on public.hospital_branch_applications for select
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('admin','insurer')));
drop policy if exists "branch_apps_insert" on public.hospital_branch_applications;
create policy "branch_apps_insert" on public.hospital_branch_applications for insert
  with check (submitted_by = (select id from public.profiles where auth_uid = auth.uid()));
drop policy if exists "branch_apps_update_admin" on public.hospital_branch_applications;
create policy "branch_apps_update_admin" on public.hospital_branch_applications for update
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('admin','insurer')));

-- ============================================================
-- HOSPITAL USERS
-- ============================================================
create table if not exists public.hospital_users (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  designation text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (hospital_id, profile_id)
);
alter table public.hospital_users enable row level security;
drop policy if exists "hospital_users_select_own" on public.hospital_users;
create policy "hospital_users_select_own" on public.hospital_users for select
  using (profile_id = (select id from public.profiles where auth_uid = auth.uid()));
drop policy if exists "hospital_users_select_admin" on public.hospital_users;
create policy "hospital_users_select_admin" on public.hospital_users for select
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('admin','insurer')));

-- ============================================================
-- INSURANCE PLANS (Insurer-managed catalog)
-- ============================================================
create table if not exists public.insurance_plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null,
  coverage_type text not null,
  coverage_limit numeric(14,2) not null,
  deductible numeric(12,2) not null default 0,
  premium_monthly numeric(10,2) not null,
  max_family_members integer not null default 4,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.insurance_plans enable row level security;
drop policy if exists "plans_select_all_auth" on public.insurance_plans;
create policy "plans_select_all_auth" on public.insurance_plans for select using (auth.uid() is not null);
drop policy if exists "plans_manage_insurer" on public.insurance_plans;
create policy "plans_manage_insurer" on public.insurance_plans for all
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('admin','insurer')));
drop trigger if exists insurance_plans_updated_at on public.insurance_plans;
create trigger insurance_plans_updated_at before update on public.insurance_plans
  for each row execute function public.handle_updated_at();

-- ============================================================
-- INSURANCE POLICIES (Patient selects a plan)
-- ============================================================
create table if not exists public.insurance_policies (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  plan_id uuid not null references public.insurance_plans(id),
  policy_number text not null unique default 'POL-' || upper(substring(gen_random_uuid()::text, 1, 8)),
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.insurance_policies enable row level security;
drop policy if exists "policies_select_own" on public.insurance_policies;
create policy "policies_select_own" on public.insurance_policies for select
  using (patient_id in (
    select pa.id from public.patients pa join public.profiles pr on pr.id = pa.profile_id where pr.auth_uid = auth.uid()
  ));
drop policy if exists "policies_insert_own" on public.insurance_policies;
create policy "policies_insert_own" on public.insurance_policies for insert
  with check (patient_id in (
    select pa.id from public.patients pa join public.profiles pr on pr.id = pa.profile_id where pr.auth_uid = auth.uid()
  ));
drop policy if exists "policies_select_provider" on public.insurance_policies;
create policy "policies_select_provider" on public.insurance_policies for select
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('provider','admin','insurer')));

-- ============================================================
-- LINKING CODES (Patient generates → Hospital enters)
-- ============================================================
create table if not exists public.linking_codes (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  used boolean not null default false,
  used_by_hospital_id uuid references public.hospitals(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.linking_codes enable row level security;
drop policy if exists "linking_codes_select_own" on public.linking_codes;
create policy "linking_codes_select_own" on public.linking_codes for select
  using (patient_id in (
    select pa.id from public.patients pa join public.profiles pr on pr.id = pa.profile_id where pr.auth_uid = auth.uid()
  ));
drop policy if exists "linking_codes_insert_own" on public.linking_codes;
create policy "linking_codes_insert_own" on public.linking_codes for insert
  with check (patient_id in (
    select pa.id from public.patients pa join public.profiles pr on pr.id = pa.profile_id where pr.auth_uid = auth.uid()
  ));
drop policy if exists "linking_codes_select_provider" on public.linking_codes;
create policy "linking_codes_select_provider" on public.linking_codes for select
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role = 'provider'));

-- ============================================================
-- PATIENT HOSPITAL LINKS
-- ============================================================
create table if not exists public.patient_hospital_links (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  linking_code_id uuid references public.linking_codes(id),
  is_active boolean not null default true,
  linked_at timestamptz not null default now(),
  unique (patient_id, hospital_id)
);
alter table public.patient_hospital_links enable row level security;
drop policy if exists "links_select_patient" on public.patient_hospital_links;
create policy "links_select_patient" on public.patient_hospital_links for select
  using (patient_id in (
    select pa.id from public.patients pa join public.profiles pr on pr.id = pa.profile_id where pr.auth_uid = auth.uid()
  ));
drop policy if exists "links_select_provider" on public.patient_hospital_links;
create policy "links_select_provider" on public.patient_hospital_links for select
  using (hospital_id in (
    select hospital_id from public.hospital_users hu join public.profiles pr on pr.id = hu.profile_id
    where pr.auth_uid = auth.uid() and hu.is_active = true
  ));
drop policy if exists "links_select_admin" on public.patient_hospital_links;
create policy "links_select_admin" on public.patient_hospital_links for select
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('admin','insurer')));

-- ============================================================
-- BILLING CASES (Hospital creates for linked patient)
-- ============================================================
create table if not exists public.billing_cases (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  hospital_id uuid not null references public.hospitals(id),
  policy_id uuid references public.insurance_policies(id),
  title text not null,
  diagnosis text not null,
  treatment_summary text not null,
  total_amount numeric(14,2) not null default 0,
  insurer_paid numeric(14,2) not null default 0,
  patient_balance numeric(14,2) generated always as (total_amount - insurer_paid) stored,
  status text not null default 'open' check (status in ('open','submitted','settled','rejected')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.billing_cases enable row level security;
drop trigger if exists billing_cases_updated_at on public.billing_cases;
create trigger billing_cases_updated_at before update on public.billing_cases
  for each row execute function public.handle_updated_at();
drop policy if exists "billing_cases_select_patient" on public.billing_cases;
create policy "billing_cases_select_patient" on public.billing_cases for select
  using (patient_id in (
    select pa.id from public.patients pa join public.profiles pr on pr.id = pa.profile_id where pr.auth_uid = auth.uid()
  ));
drop policy if exists "billing_cases_select_provider" on public.billing_cases;
create policy "billing_cases_select_provider" on public.billing_cases for select
  using (hospital_id in (
    select hospital_id from public.hospital_users hu join public.profiles pr on pr.id = hu.profile_id
    where pr.auth_uid = auth.uid() and hu.is_active = true
  ));
drop policy if exists "billing_cases_insert_provider" on public.billing_cases;
create policy "billing_cases_insert_provider" on public.billing_cases for insert
  with check (hospital_id in (
    select hospital_id from public.hospital_users hu join public.profiles pr on pr.id = hu.profile_id
    where pr.auth_uid = auth.uid() and hu.is_active = true
  ));
drop policy if exists "billing_cases_update_provider" on public.billing_cases;
create policy "billing_cases_update_provider" on public.billing_cases for update
  using (hospital_id in (
    select hospital_id from public.hospital_users hu join public.profiles pr on pr.id = hu.profile_id
    where pr.auth_uid = auth.uid() and hu.is_active = true
  ));
drop policy if exists "billing_cases_select_admin" on public.billing_cases;
create policy "billing_cases_select_admin" on public.billing_cases for select
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('admin','insurer')));

-- ============================================================
-- BILLING ITEMS
-- ============================================================
create table if not exists public.billing_items (
  id uuid primary key default uuid_generate_v4(),
  billing_case_id uuid not null references public.billing_cases(id) on delete cascade,
  description text not null,
  quantity integer not null default 1,
  unit_cost numeric(10,2) not null,
  total_cost numeric(12,2) generated always as (quantity * unit_cost) stored,
  billed_at timestamptz not null default now()
);
alter table public.billing_items enable row level security;
drop policy if exists "billing_items_select_patient" on public.billing_items;
create policy "billing_items_select_patient" on public.billing_items for select
  using (billing_case_id in (
    select bc.id from public.billing_cases bc join public.patients pa on pa.id = bc.patient_id
    join public.profiles pr on pr.id = pa.profile_id where pr.auth_uid = auth.uid()
  ));
drop policy if exists "billing_items_manage_provider" on public.billing_items;
create policy "billing_items_manage_provider" on public.billing_items for all
  using (billing_case_id in (
    select bc.id from public.billing_cases bc join public.hospital_users hu on hu.hospital_id = bc.hospital_id
    join public.profiles pr on pr.id = hu.profile_id where pr.auth_uid = auth.uid() and hu.is_active = true
  ));
drop policy if exists "billing_items_select_admin" on public.billing_items;
create policy "billing_items_select_admin" on public.billing_items for select
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('admin','insurer')));

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  billing_case_id uuid references public.billing_cases(id),
  claim_id uuid,
  document_type text not null check (document_type in ('lab_report','invoice','license','medical_record','id_proof')),
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_at timestamptz not null default now()
);
alter table public.documents enable row level security;
drop policy if exists "documents_select_owner" on public.documents;
create policy "documents_select_owner" on public.documents for select
  using (owner_id = (select id from public.profiles where auth_uid = auth.uid()));
drop policy if exists "documents_select_provider_case" on public.documents;
create policy "documents_select_provider_case" on public.documents for select
  using (billing_case_id in (
    select bc.id from public.billing_cases bc join public.hospital_users hu on hu.hospital_id = bc.hospital_id
    join public.profiles pr on pr.id = hu.profile_id where pr.auth_uid = auth.uid() and hu.is_active = true
  ));
drop policy if exists "documents_select_admin" on public.documents;
create policy "documents_select_admin" on public.documents for select
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('admin','insurer')));
drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents for insert
  with check (owner_id = (select id from public.profiles where auth_uid = auth.uid()));

-- ============================================================
-- CLAIMS (submitted by hospital to insurer)
-- ============================================================
create table if not exists public.claims (
  id uuid primary key default uuid_generate_v4(),
  billing_case_id uuid not null references public.billing_cases(id) on delete cascade,
  patient_id uuid not null references public.patients(id),
  policy_id uuid not null references public.insurance_policies(id),
  submitted_by uuid not null references public.profiles(id),
  amount_claimed numeric(14,2) not null,
  amount_approved numeric(14,2),
  status text not null default 'submitted' check (status in ('submitted','under_review','approved','rejected','paid')),
  reviewer_id uuid references public.profiles(id),
  decision_reason text,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.claims enable row level security;
drop policy if exists "claims_select_patient" on public.claims;
create policy "claims_select_patient" on public.claims for select
  using (patient_id in (
    select pa.id from public.patients pa join public.profiles pr on pr.id = pa.profile_id where pr.auth_uid = auth.uid()
  ));
drop policy if exists "claims_select_provider" on public.claims;
create policy "claims_select_provider" on public.claims for select
  using (submitted_by = (select id from public.profiles where auth_uid = auth.uid()));
drop policy if exists "claims_insert_provider" on public.claims;
create policy "claims_insert_provider" on public.claims for insert
  with check (submitted_by = (select id from public.profiles where auth_uid = auth.uid()));
drop policy if exists "claims_select_admin" on public.claims;
create policy "claims_select_admin" on public.claims for select
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('admin','insurer')));
drop policy if exists "claims_update_admin" on public.claims;
create policy "claims_update_admin" on public.claims for update
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('admin','insurer')));

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
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

-- ============================================================
-- AUDIT LOGS
-- ============================================================
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid not null references public.profiles(id),
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
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role in ('admin','insurer')));

-- ============================================================
-- SEED — sample insurance plans
-- ============================================================
insert into public.insurance_plans (id, name, description, coverage_type, coverage_limit, deductible, premium_monthly, max_family_members, is_active, created_by)
select
  uuid_generate_v4(),
  'Basic Health Cover',
  'Covers essential inpatient and outpatient treatments up to ₹3 Lakh.',
  'basic',
  300000, 5000, 799, 2, true,
  (select id from public.profiles where role in ('admin','insurer') limit 1)
where exists (select 1 from public.profiles where role in ('admin','insurer'));

insert into public.insurance_plans (id, name, description, coverage_type, coverage_limit, deductible, premium_monthly, max_family_members, is_active, created_by)
select
  uuid_generate_v4(),
  'Family Floater Plus',
  'Comprehensive family cover with ₹10 Lakh limit, includes diagnostics.',
  'comprehensive',
  1000000, 2500, 1499, 6, true,
  (select id from public.profiles where role in ('admin','insurer') limit 1)
where exists (select 1 from public.profiles where role in ('admin','insurer'));

insert into public.insurance_plans (id, name, description, coverage_type, coverage_limit, deductible, premium_monthly, max_family_members, is_active, created_by)
select
  uuid_generate_v4(),
  'Senior Care Shield',
  'Tailored for 60+ patients. Covers chronic illness, surgery, and ICU.',
  'senior',
  500000, 10000, 2499, 1, true,
  (select id from public.profiles where role in ('admin','insurer') limit 1)
where exists (select 1 from public.profiles where role in ('admin','insurer'));
