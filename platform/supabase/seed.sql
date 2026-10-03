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
create policy "lab_reports_access" on storage.objects for all using (
  bucket_id = 'lab-reports' and auth.role() = 'authenticated'
);

create policy "invoices_access" on storage.objects for all using (
  bucket_id = 'invoices' and auth.role() = 'authenticated'
);

create policy "licenses_access" on storage.objects for all using (
  bucket_id = 'licenses'
);

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
