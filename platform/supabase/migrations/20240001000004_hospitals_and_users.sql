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
create policy "hospitals_select_all_auth"
  on public.hospitals
  for select
  using (auth.uid() is not null);

-- Only admins may register new hospitals.
create policy "hospitals_insert_admin"
  on public.hospitals
  for insert
  with check (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role = 'admin'
    )
  );

-- Only admins may update hospital status / details.
create policy "hospitals_update_admin"
  on public.hospitals
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
create policy "branch_apps_select_submitter"
  on public.hospital_branch_applications
  for select
  using (submitted_by = (select id from public.profiles where auth_uid = auth.uid()));

-- Admins and insurers can read all applications (review queue).
create policy "branch_apps_select_admin"
  on public.hospital_branch_applications
  for select
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role in ('admin', 'insurer')
    )
  );

-- Authenticated users can submit applications on their own behalf.
create policy "branch_apps_insert"
  on public.hospital_branch_applications
  for insert
  with check (submitted_by = (select id from public.profiles where auth_uid = auth.uid()));

-- Admins and insurers can update status / record decision.
create policy "branch_apps_update_admin"
  on public.hospital_branch_applications
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
create policy "hospital_users_select_own"
  on public.hospital_users
  for select
  using (profile_id = (select id from public.profiles where auth_uid = auth.uid()));

-- Admins can read all hospital-user mappings.
create policy "hospital_users_select_admin"
  on public.hospital_users
  for select
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role = 'admin'
    )
  );

-- Providers in the same hospital can see their colleagues.
create policy "hospital_users_select_same_hospital"
  on public.hospital_users
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
create policy "hospital_users_insert_admin"
  on public.hospital_users
  for insert
  with check (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role = 'admin'
    )
  );

create policy "hospital_users_update_admin"
  on public.hospital_users
  for update
  using (
    exists (
      select 1 from public.profiles
      where  auth_uid = auth.uid() and role = 'admin'
    )
  );
