/**
 * Shared domain types for Insurance/Healthcare Platform.
 * Consumed by all backend services and front-end apps.
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export type UserRole = 'patient' | 'provider' | 'admin' | 'insurer';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type ClaimStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'paid';

export type DocumentType =
  | 'prescription'
  | 'lab_report'
  | 'imaging'
  | 'discharge_summary'
  | 'invoice'
  | 'insurance_card'
  | 'other';

export type NotificationType =
  | 'appointment_reminder'
  | 'appointment_status'
  | 'claim_update'
  | 'document_uploaded'
  | 'general';

export type PolicyStatus = 'active' | 'expired' | 'cancelled' | 'pending';

export type CaseStatus = 'open' | 'in_progress' | 'closed';

// ---------------------------------------------------------------------------
// Database row shapes (snake_case — matches Supabase columns)
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientDetail {
  id: string;
  profile_id: string;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  primary_patient_id: string;
  member_profile_id: string;
  relationship: string;
  status: 'pending' | 'active' | 'removed';
  created_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  provider_id?: string | null;
  hospital_id: string;
  scheduled_at: string;
  reason: string;
  status: AppointmentStatus;
  notes?: string | null;
  case_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string;
  patient_id: string;
  provider_id?: string | null;
  appointment_id?: string | null;
  diagnosis?: string | null;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  patient_id: string;
  case_id?: string | null;
  document_type: DocumentType;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  deleted_at?: string | null;
  created_at: string;
}

export interface InsurancePolicy {
  id: string;
  patient_id: string;
  insurer_id?: string | null;
  policy_number: string;
  plan_name: string;
  coverage_amount: number;
  premium_amount: number;
  start_date: string;
  end_date: string;
  status: PolicyStatus;
  created_at: string;
  updated_at: string;
}

export interface Claim {
  id: string;
  patient_id: string;
  policy_id: string;
  case_id: string;
  amount_claimed: number;
  amount_approved?: number | null;
  status: ClaimStatus;
  rejection_reason?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreatmentItem {
  id: string;
  case_id: string;
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  performed_at: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  reference_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// API Response shapes (camelCase optional wrappers)
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ---------------------------------------------------------------------------
// Specific response shapes used across services
// ---------------------------------------------------------------------------

export interface AppointmentResponse extends Appointment {
  hospital?: Pick<Hospital, 'id' | 'name' | 'address'>;
  patient?: Pick<Profile, 'id' | 'first_name' | 'last_name'>;
  provider?: Pick<Profile, 'id' | 'first_name' | 'last_name'> | null;
  case?: Pick<Case, 'id' | 'status' | 'diagnosis'> | null;
}

export interface ClaimResponse extends Claim {
  policy?: Pick<InsurancePolicy, 'id' | 'policy_number' | 'plan_name'>;
  case?: Pick<Case, 'id' | 'diagnosis' | 'status'>;
}

export interface DocumentResponse extends Document {
  signed_url?: string;
}

export interface ProfileResponse extends Profile {
  patient_details?: PatientDetail | null;
}

// ---------------------------------------------------------------------------
// Request augmentation — attached by auth middleware
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  user: {
    id: string;
    email?: string;
    phone?: string;
  };
  profile: Profile;
}
