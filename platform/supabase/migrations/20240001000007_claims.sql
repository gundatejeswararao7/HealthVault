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
create policy "claims_select_patient"
  on public.claims
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
create policy "claims_select_family"
  on public.claims
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
create policy "claims_select_insurer"
  on public.claims
  for select
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role in ('insurer', 'admin')
    )
  );

-- ── Insert Policy ────────────────────────────────────────────

-- Patients can only create claims against their own patient record.
create policy "claims_insert_patient"
  on public.claims
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
create policy "claims_update_patient_draft"
  on public.claims
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
create policy "claims_update_insurer"
  on public.claims
  for update
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role in ('insurer', 'admin')
    )
  );
