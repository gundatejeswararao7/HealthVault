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

create policy "notifications_select_own" on public.notifications for select
  using (recipient_id = (select id from public.profiles where auth_uid = auth.uid()));

create policy "notifications_update_own" on public.notifications for update
  using (recipient_id = (select id from public.profiles where auth_uid = auth.uid()));

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

create policy "audit_logs_select_admin" on public.audit_logs for select
  using (exists (select 1 from public.profiles where auth_uid = auth.uid() and role = 'admin'));

create policy "audit_logs_insert_all" on public.audit_logs for insert
  with check (true);
