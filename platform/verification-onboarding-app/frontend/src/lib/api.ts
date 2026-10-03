/**
 * Typed API client for the verification-onboarding backend (port 4003).
 * All mutating calls attach the Supabase session JWT as Bearer token.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4003';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { headers, ...rest });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? res.statusText);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  pending_branch_applications: number;
  pending_family_requests: number;
  pending_claims: number;
  under_review_claims: number;
  active_hospitals: number;
  registered_patients: number;
  claims_approved_this_month_amount: number;
}

export async function getDashboardStats(token: string): Promise<DashboardStats> {
  return request<DashboardStats>('/api/v1/dashboard/stats', { token });
}

// ─── Branch Applications ───────────────────────────────────────────────────────

export interface BranchApplication {
  id: string;
  hospital_name: string;
  license_number: string;
  address: string;
  phone: string;
  email: string;
  license_document_path: string | null;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  decision_reason: string | null;
  reviewer_id: string | null;
  reviewer_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface BranchApplicationsResponse {
  data: BranchApplication[];
  total: number;
  page: number;
  limit: number;
}

export async function getBranchApplications(
  token: string,
  params: { status?: string; search?: string; page?: number; limit?: number } = {}
): Promise<BranchApplicationsResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  if (params.page != null) qs.set('page', String(params.page));
  if (params.limit != null) qs.set('limit', String(params.limit));
  return request<BranchApplicationsResponse>(`/api/v1/branch-applications?${qs}`, { token });
}

export async function getBranchApplication(token: string, id: string): Promise<BranchApplication> {
  return request<BranchApplication>(`/api/v1/branch-applications/${id}`, { token });
}

export async function submitBranchApplication(body: {
  hospital_name: string;
  license_number: string;
  address: string;
  phone: string;
  email: string;
  license_document_path?: string;
}): Promise<{ id: string; message: string }> {
  return request<{ id: string; message: string }>('/api/v1/branch-applications', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateBranchApplicationDecision(
  token: string,
  id: string,
  body: { decision: 'under_review' | 'approved' | 'rejected'; decision_reason?: string }
): Promise<BranchApplication> {
  return request<BranchApplication>(`/api/v1/branch-applications/${id}/decision`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(body),
  });
}

export async function getBranchApplicationSignedUrl(
  token: string,
  id: string
): Promise<{ signed_url: string }> {
  return request<{ signed_url: string }>(`/api/v1/branch-applications/${id}/document-url`, {
    token,
  });
}

// ─── Family Requests ──────────────────────────────────────────────────────────

export interface FamilyRequest {
  id: string;
  primary_patient_id: string;
  primary_patient_name: string;
  member_name: string;
  relationship: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  decision_reason: string | null;
  reviewer_id: string | null;
  reviewer_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyRequestsResponse {
  data: FamilyRequest[];
  total: number;
  page: number;
  limit: number;
}

export async function getFamilyRequests(
  token: string,
  params: { status?: string; search?: string; page?: number; limit?: number } = {}
): Promise<FamilyRequestsResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  if (params.page != null) qs.set('page', String(params.page));
  if (params.limit != null) qs.set('limit', String(params.limit));
  return request<FamilyRequestsResponse>(`/api/v1/family-requests?${qs}`, { token });
}

export async function getFamilyRequest(token: string, id: string): Promise<FamilyRequest> {
  return request<FamilyRequest>(`/api/v1/family-requests/${id}`, { token });
}

export async function updateFamilyRequestDecision(
  token: string,
  id: string,
  body: { decision: 'under_review' | 'approved' | 'rejected'; decision_reason?: string }
): Promise<FamilyRequest> {
  return request<FamilyRequest>(`/api/v1/family-requests/${id}/decision`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(body),
  });
}

// ─── Claims ───────────────────────────────────────────────────────────────────

export interface TreatmentItem {
  description: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

export interface Claim {
  id: string;
  patient_id: string;
  patient_name: string;
  policy_number: string;
  policy_type: string;
  amount_claimed: number;
  amount_approved: number | null;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';
  decision_reason: string | null;
  case_summary: string | null;
  treatment_items: TreatmentItem[];
  reviewer_id: string | null;
  reviewer_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimsResponse {
  data: Claim[];
  total: number;
  page: number;
  limit: number;
}

export async function getClaims(
  token: string,
  params: {
    status?: string;
    patient?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<ClaimsResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.patient) qs.set('patient', params.patient);
  if (params.date_from) qs.set('date_from', params.date_from);
  if (params.date_to) qs.set('date_to', params.date_to);
  if (params.page != null) qs.set('page', String(params.page));
  if (params.limit != null) qs.set('limit', String(params.limit));
  return request<ClaimsResponse>(`/api/v1/claims?${qs}`, { token });
}

export async function getClaim(token: string, id: string): Promise<Claim> {
  return request<Claim>(`/api/v1/claims/${id}`, { token });
}

export async function updateClaimDecision(
  token: string,
  id: string,
  body: {
    decision: 'under_review' | 'approved' | 'rejected';
    amount_approved?: number;
    decision_reason?: string;
  }
): Promise<Claim> {
  return request<Claim>(`/api/v1/claims/${id}/decision`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(body),
  });
}

export async function markClaimPaid(token: string, id: string): Promise<Claim> {
  return request<Claim>(`/api/v1/claims/${id}/mark-paid`, {
    method: 'PATCH',
    token,
  });
}

// ─── Hospitals ────────────────────────────────────────────────────────────────

export interface HospitalUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  license_number: string;
  address: string;
  phone: string;
  email: string;
  status: 'active' | 'suspended';
  users: HospitalUser[];
  created_at: string;
  updated_at: string;
}

export interface HospitalsResponse {
  data: Hospital[];
  total: number;
  page: number;
  limit: number;
}

export async function getHospitals(
  token: string,
  params: { status?: string; page?: number; limit?: number } = {}
): Promise<HospitalsResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.page != null) qs.set('page', String(params.page));
  if (params.limit != null) qs.set('limit', String(params.limit));
  return request<HospitalsResponse>(`/api/v1/hospitals?${qs}`, { token });
}

export async function getHospital(token: string, id: string): Promise<Hospital> {
  return request<Hospital>(`/api/v1/hospitals/${id}`, { token });
}

export async function updateHospitalStatus(
  token: string,
  id: string,
  status: 'active' | 'suspended'
): Promise<Hospital> {
  return request<Hospital>(`/api/v1/hospitals/${id}/status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status }),
  });
}

export async function addHospitalUser(
  token: string,
  hospitalId: string,
  body: { email: string; role: string }
): Promise<HospitalUser> {
  return request<HospitalUser>(`/api/v1/hospitals/${hospitalId}/users`, {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  });
}

export async function removeHospitalUser(
  token: string,
  hospitalId: string,
  userId: string
): Promise<void> {
  return request<void>(`/api/v1/hospitals/${hospitalId}/users/${userId}`, {
    method: 'DELETE',
    token,
  });
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export async function getAuditLogs(
  token: string,
  params: { page?: number; limit?: number } = {}
): Promise<AuditLogsResponse> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set('page', String(params.page));
  if (params.limit != null) qs.set('limit', String(params.limit));
  return request<AuditLogsResponse>(`/api/v1/audit-logs?${qs}`, { token });
}
