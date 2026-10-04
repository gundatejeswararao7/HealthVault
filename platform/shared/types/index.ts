// ============================================================
// Insurance / Healthcare Platform — Shared Types
// ============================================================

// ----------------------------------------------------------
// Enumerations (union types)
// ----------------------------------------------------------

/** Roles that a platform user can hold. */
export type UserRole = 'patient' | 'family_member' | 'provider' | 'admin' | 'insurer';

/** Generic review lifecycle statuses used across several entities. */
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'under_review';

/** Lifecycle states for a scheduled appointment. */
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

/** Full lifecycle of an insurance claim. */
export type ClaimStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';

/** Onboarding / operational status for a hospital or branch. */
export type BranchStatus = 'pending' | 'active' | 'rejected' | 'suspended';

/** Supported document categories used in storage and classification. */
export type DocumentType = 'lab_report' | 'invoice' | 'license' | 'case_document' | 'id_proof';

// ----------------------------------------------------------
// Core Entity Interfaces
// ----------------------------------------------------------

/**
 * A platform user profile, linked 1-to-1 with a Supabase Auth user.
 * Role determines access scope across the entire system.
 */
export interface Profile {
  id: string;
  auth_uid: string;
  role: UserRole;
  /** Set for family_member profiles to point at the primary patient's profile. */
  primary_patient_id?: string;
  /** Set for provider profiles to associate them with a hospital branch. */
  branch_id?: string;
  id_verified: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Clinical / demographic record for a patient.
 * Linked 1-to-1 with a Profile of role 'patient'.
 */
export interface Patient {
  id: string;
  profile_id: string;
  full_name: string;
  /** ISO-8601 date string, e.g. "1990-05-20". */
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
}

/**
 * A dependent/family member added by a primary patient.
 * Requires admin/insurer approval before granting access.
 */
export interface FamilyMember {
  id: string;
  primary_patient_id: string;
  /** Profile created for the family member once approved. */
  profile_id: string;
  full_name: string;
  relationship: string;
  /** ISO-8601 date string. */
  date_of_birth: string;
  status: ReviewStatus;
  reviewer_id?: string;
  decision_reason?: string;
  reviewed_at?: string;
  created_at: string;
}

/**
 * An insurance policy held by a patient.
 * Coverage limit and deductible are stored in minor currency units (e.g. USD).
 */
export interface InsurancePolicy {
  id: string;
  patient_id: string;
  policy_number: string;
  provider_name: string;
  coverage_type: string;
  coverage_limit: number;
  deductible: number;
  premium: number;
  /** ISO-8601 date string. */
  start_date: string;
  /** ISO-8601 date string. */
  end_date: string;
  is_active: boolean;
  created_at: string;
}

/**
 * A registered hospital (top-level entity, not a branch).
 * Branches are modelled via HospitalBranchApplication.
 */
export interface Hospital {
  id: string;
  name: string;
  license_number: string;
  address: string;
  phone: string;
  email: string;
  status: BranchStatus;
  created_at: string;
}

/**
 * An application submitted by a hospital to operate a branch/facility.
 * Admin/insurer reviews and approves or rejects.
 */
export interface HospitalBranchApplication {
  id: string;
  hospital_id: string;
  submitted_by: string;
  license_document_path: string;
  additional_docs: string[];
  status: ReviewStatus;
  reviewer_id?: string;
  decision_reason?: string;
  reviewed_at?: string;
  created_at: string;
}

/**
 * Association between a hospital and a provider (staff) profile.
 * Controls which providers can create appointments/cases for that hospital.
 */
export interface HospitalUser {
  id: string;
  hospital_id: string;
  profile_id: string;
  designation: string;
  is_active: boolean;
  created_at: string;
}

/**
 * A scheduled consultation between a patient and a provider at a hospital.
 */
export interface Appointment {
  id: string;
  patient_id: string;
  hospital_id: string;
  provider_profile_id: string;
  /** ISO-8601 datetime string with timezone. */
  scheduled_at: string;
  reason: string;
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * A clinical case opened by a provider following an appointment.
 * Acts as the grouping entity for treatment items, documents, and claims.
 */
export interface Case {
  id: string;
  appointment_id: string;
  patient_id: string;
  hospital_id: string;
  diagnosis: string;
  treatment_plan: string;
  /** ISO-8601 datetime string when the case was opened. */
  opened_at: string;
  /** ISO-8601 datetime string when the case was closed, if applicable. */
  closed_at?: string;
}

/**
 * A single billable treatment or service line within a Case.
 * total_cost is a generated column (quantity × unit_cost) in the DB.
 */
export interface TreatmentItem {
  id: string;
  case_id: string;
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  /** ISO-8601 datetime string. */
  billed_at: string;
}

/**
 * A file attachment associated with a patient, case, or appointment.
 * Actual binary is stored in Supabase Storage; this record holds metadata.
 */
export interface Document {
  id: string;
  owner_id: string;
  case_id?: string;
  appointment_id?: string;
  document_type: DocumentType;
  file_name: string;
  /** Supabase Storage object path (bucket-relative). */
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  /** ISO-8601 datetime string. */
  uploaded_at: string;
}

/**
 * An insurance claim filed by a patient against a policy for a given case.
 * Progresses through the ClaimStatus lifecycle.
 */
export interface Claim {
  id: string;
  patient_id: string;
  policy_id: string;
  case_id: string;
  amount_claimed: number;
  amount_approved?: number;
  status: ClaimStatus;
  reviewer_id?: string;
  decision_reason?: string;
  reviewed_at?: string;
  /** ISO-8601 datetime string; set when patient moves claim from draft → submitted. */
  submitted_at: string;
  created_at: string;
}

/**
 * In-app notification delivered to a specific profile.
 * Optionally links to the triggering record via reference_id / reference_table.
 */
export interface Notification {
  id: string;
  recipient_id: string;
  title: string;
  body: string;
  type: string;
  reference_id?: string;
  reference_table?: string;
  read: boolean;
  /** ISO-8601 datetime string. */
  created_at: string;
}

/**
 * Immutable audit trail entry for any state-changing action.
 * Written by the service layer with the service-role key.
 */
export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
  /** ISO-8601 datetime string. */
  created_at: string;
}

// ----------------------------------------------------------
// API Request / Response Shapes
// ----------------------------------------------------------

/**
 * Standard envelope returned by every API endpoint.
 * Exactly one of `data` or `error` will be present on any given response.
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination wrapper for list endpoints.
 */
export interface PaginatedResponse<T> {
  data: T[];
  items?: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages?: number;
}

/**
 * Payload sent by a reviewer (admin/insurer) to approve or reject any
 * reviewable entity (family member, branch application, claim, etc.).
 */
export interface ReviewDecision {
  status: 'approved' | 'rejected';
  /** Required when status is 'rejected'; optional (but recommended) for 'approved'. */
  decision_reason?: string;
}

/** Request body for scheduling a new appointment. */
export interface CreateAppointmentRequest {
  hospital_id: string;
  /** ISO-8601 datetime string (must be in the future). */
  scheduled_at: string;
  reason: string;
}

/** Metadata sent alongside a multipart document upload. */
export interface UploadDocumentRequest {
  document_type: DocumentType;
  /** Associate with an open case, if applicable. */
  case_id?: string;
  /** Associate with a specific appointment, if applicable. */
  appointment_id?: string;
}

/** Request body for creating a new insurance claim. */
export interface CreateClaimRequest {
  policy_id: string;
  case_id: string;
  amount_claimed: number;
}

/** Request body for adding a new family member under the current patient. */
export interface CreateFamilyMemberRequest {
  full_name: string;
  relationship: string;
  /** ISO-8601 date string. */
  date_of_birth: string;
  email: string;
}

/** Authenticated request context attached by auth middleware */
export interface AuthenticatedUser {
  user: {
    id: string;
    email?: string;
    phone?: string;
  };
  profile: Profile;
  token?: string;
}

/** Typed appointment API response */
export type AppointmentResponse = Appointment;

