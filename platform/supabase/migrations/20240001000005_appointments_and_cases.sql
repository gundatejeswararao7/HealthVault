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
create policy "appointments_select_patient"
  on public.appointments
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
create policy "appointments_select_family"
  on public.appointments
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
create policy "appointments_select_provider"
  on public.appointments
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
create policy "appointments_select_admin"
  on public.appointments
  for select
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role in ('admin', 'insurer')
    )
  );

-- Patients book their own appointments.
create policy "appointments_insert_patient"
  on public.appointments
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
create policy "appointments_update_provider"
  on public.appointments
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
create policy "cases_select_patient"
  on public.cases
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
create policy "cases_select_family"
  on public.cases
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
create policy "cases_select_provider"
  on public.cases
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
create policy "cases_select_admin"
  on public.cases
  for select
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role in ('admin', 'insurer')
    )
  );

-- Active hospital staff can open cases at their hospital.
create policy "cases_insert_provider"
  on public.cases
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
create policy "cases_update_provider"
  on public.cases
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
create policy "treatment_items_select_patient"
  on public.treatment_items
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
create policy "treatment_items_select_provider"
  on public.treatment_items
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
create policy "treatment_items_manage_provider"
  on public.treatment_items
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
create policy "treatment_items_select_admin"
  on public.treatment_items
  for select
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role in ('admin', 'insurer')
    )
  );
