export type UserRole = 'patient' | 'family_member' | 'provider' | 'admin' | 'insurer';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'under_review';
export type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';
export type BillingCaseStatus = 'open' | 'submitted' | 'settled' | 'rejected';
export type BranchStatus = 'pending' | 'active' | 'rejected' | 'suspended';
export type DocumentType = 'lab_report' | 'invoice' | 'license' | 'medical_record' | 'id_proof';

export interface Profile { id: string; auth_uid: string; role: UserRole; primary_patient_id?: string; branch_id?: string; id_verified: boolean; created_at: string; updated_at: string; }
export interface AuthenticatedUser { id: string; email: string; role: UserRole; profileId: string; hospitalId?: string; token: string; }
export interface Patient { id: string; profile_id: string; full_name: string; date_of_birth: string; gender: string; phone: string; email: string; address: string; created_at: string; }
export interface FamilyMember { id: string; primary_patient_id: string; profile_id?: string; full_name: string; relationship: string; date_of_birth: string; status: ReviewStatus; reviewer_id?: string; decision_reason?: string; reviewed_at?: string; created_at: string; }
export interface InsurancePlan { id: string; name: string; description: string; coverage_type: string; coverage_limit: number; deductible: number; premium_monthly: number; max_family_members: number; is_active: boolean; created_at: string; }
export interface InsurancePolicy { id: string; patient_id: string; plan_id: string; policy_number: string; start_date: string; end_date: string; is_active: boolean; created_at: string; }
export interface LinkingCode { id: string; patient_id: string; code: string; expires_at: string; used: boolean; used_by_hospital_id?: string; used_at?: string; created_at: string; }
export interface PatientHospitalLink { id: string; patient_id: string; hospital_id: string; linking_code_id?: string; is_active: boolean; linked_at: string; }
export interface BillingCase { id: string; patient_id: string; hospital_id: string; policy_id?: string; title: string; diagnosis: string; treatment_summary: string; total_amount: number; insurer_paid: number; patient_balance: number; status: BillingCaseStatus; opened_at: string; closed_at?: string; }
export interface BillingItem { id: string; billing_case_id: string; description: string; quantity: number; unit_cost: number; total_cost: number; billed_at: string; }
export interface Document { id: string; owner_id: string; billing_case_id?: string; claim_id?: string; document_type: DocumentType; file_name: string; storage_path: string; mime_type: string; size_bytes: number; uploaded_at: string; }
export interface Claim { id: string; billing_case_id: string; patient_id: string; policy_id: string; submitted_by: string; amount_claimed: number; amount_approved?: number; status: ClaimStatus; reviewer_id?: string; decision_reason?: string; reviewed_at?: string; submitted_at: string; }
export interface Notification { id: string; recipient_id: string; title: string; body: string; type: string; reference_id?: string; reference_table?: string; read: boolean; created_at: string; }
export interface Hospital { id: string; name: string; license_number: string; address: string; phone: string; email: string; status: BranchStatus; created_at: string; }
export interface ApiResponse<T> { data?: T; error?: string; message?: string; }
export interface PaginatedResponse<T> { data: T[]; total: number; page: number; per_page: number; total_pages?: number; }
export interface ReviewDecision { status: 'approved' | 'rejected'; decision_reason?: string; }
