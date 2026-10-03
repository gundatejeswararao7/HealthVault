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
create policy "documents_select_owner"
  on public.documents
  for select
  using (owner_id = (select id from public.profiles where auth_uid = auth.uid()));

-- Active hospital staff can read documents linked to cases at their hospital.
create policy "documents_select_provider_case"
  on public.documents
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
create policy "documents_select_provider_appointment"
  on public.documents
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
create policy "documents_select_admin"
  on public.documents
  for select
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role in ('admin', 'insurer')
    )
  );

-- ── Insert Policy ───────────────────────────────────────────

-- Any authenticated user can upload documents on their own behalf.
create policy "documents_insert_own"
  on public.documents
  for insert
  with check (owner_id = (select id from public.profiles where auth_uid = auth.uid()));

-- ── Delete Policy ───────────────────────────────────────────

-- Owners can delete their own documents.
-- The API layer should also remove the Storage object before deleting the row.
create policy "documents_delete_own"
  on public.documents
  for delete
  using (owner_id = (select id from public.profiles where auth_uid = auth.uid()));
