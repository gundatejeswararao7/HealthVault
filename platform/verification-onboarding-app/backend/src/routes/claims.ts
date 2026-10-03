import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const claimDecisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  amount_approved: z.number().positive().optional(),
  decision_reason: z.string().min(1).max(2000).optional(),
}).refine(
  (d) => d.status !== 'approved' || (d.amount_approved !== undefined && d.amount_approved > 0),
  { message: 'amount_approved is required and must be positive when approving', path: ['amount_approved'] },
).refine(
  (d) => d.status !== 'rejected' || (d.decision_reason && d.decision_reason.length > 0),
  { message: 'decision_reason is required when rejecting', path: ['decision_reason'] },
);

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export default async function claimsRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /claims
   * List submitted/under_review claims (insurer/admin).
   * Filter by status, patient_id, policy_id, date range.
   */
  fastify.get(
    '/claims',
    { preHandler: [authenticate, requireRole(['admin', 'insurer'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as Record<string, string | undefined>;
      const status = query['status'];
      const patientId = query['patient_id'];
      const policyId = query['policy_id'];
      const dateFrom = query['date_from'];
      const dateTo = query['date_to'];
      const page = Math.max(1, parseInt(query['page'] ?? '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query['limit'] ?? '20', 10)));
      const offset = (page - 1) * limit;

      let q = supabaseAdmin
        .from('claims')
        .select(
          `
          id,
          status,
          amount_claimed,
          amount_approved,
          decision_reason,
          created_at,
          updated_at,
          reviewed_at,
          reviewer_id,
          patient:profiles!claims_patient_id_fkey (
            id,
            full_name,
            email
          ),
          policy:insurance_policies!claims_policy_id_fkey (
            id,
            policy_number,
            plan_name
          ),
          medical_case:medical_cases!claims_case_id_fkey (
            id,
            summary,
            diagnosis
          )
          `,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        q = q.eq('status', status);
      } else {
        // By default, show only actionable claims
        q = q.in('status', ['submitted', 'under_review']);
      }
      if (patientId) q = q.eq('patient_id', patientId);
      if (policyId) q = q.eq('policy_id', policyId);
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', dateTo);

      const { data, error, count } = await q;
      if (error) {
        request.log.error(error, 'claims list error');
        return reply.status(500).send({ error: 'Failed to fetch claims' });
      }

      return reply.send({
        data,
        pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
      });
    },
  );

  /**
   * GET /claims/:id
   * Full claim details: claim + patient + policy + case + treatment_items.
   */
  fastify.get(
    '/claims/:id',
    { preHandler: [authenticate, requireRole(['admin', 'insurer'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const { data, error } = await supabaseAdmin
        .from('claims')
        .select(
          `
          id,
          status,
          amount_claimed,
          amount_approved,
          decision_reason,
          created_at,
          updated_at,
          reviewed_at,
          reviewer_id,
          patient:profiles!claims_patient_id_fkey (
            id,
            full_name,
            email,
            phone,
            date_of_birth
          ),
          policy:insurance_policies!claims_policy_id_fkey (
            id,
            policy_number,
            plan_name,
            coverage_amount,
            deductible,
            start_date,
            end_date
          ),
          medical_case:medical_cases!claims_case_id_fkey (
            id,
            summary,
            diagnosis,
            admission_date,
            discharge_date,
            hospital:hospitals!medical_cases_hospital_id_fkey (
              id,
              name,
              address
            )
          ),
          treatment_items (
            id,
            description,
            category,
            quantity,
            unit_cost,
            total_cost
          )
          `,
        )
        .eq('id', id)
        .single();

      if (error || !data) {
        return reply.status(404).send({ error: 'Claim not found' });
      }

      return reply.send({ data });
    },
  );

  /**
   * PATCH /claims/:id/decision
   * Approve or reject a claim (insurer/admin).
   * amount_approved must be ≤ amount_claimed when approving.
   */
  fastify.patch(
    '/claims/:id/decision',
    { preHandler: [authenticate, requireRole(['admin', 'insurer'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const parsed = claimDecisionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
      }

      const { status: newStatus, amount_approved, decision_reason } = parsed.data;

      // Fetch current claim
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('claims')
        .select('id, status, amount_claimed, patient_id')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return reply.status(404).send({ error: 'Claim not found' });
      }

      // Guard: only submitted/under_review claims can be decided
      if (!['submitted', 'under_review'].includes(existing.status as string)) {
        return reply.status(409).send({ error: `Claim is already ${existing.status} — cannot re-decide` });
      }

      // Enforce amount_approved ≤ amount_claimed
      const amountClaimed = existing.amount_claimed as number;
      if (newStatus === 'approved' && amount_approved !== undefined && amount_approved > amountClaimed) {
        return reply.status(400).send({
          error: `amount_approved (${amount_approved}) cannot exceed amount_claimed (${amountClaimed})`,
        });
      }

      const oldStatus = existing.status as string;

      // Update claim
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('claims')
        .update({
          status: newStatus,
          amount_approved: newStatus === 'approved' ? (amount_approved ?? null) : null,
          decision_reason: decision_reason ?? null,
          reviewer_id: request.user.profileId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, status, amount_approved, decision_reason, reviewed_at')
        .single();

      if (updateError || !updated) {
        request.log.error(updateError, 'claims update error');
        return reply.status(500).send({ error: 'Failed to update claim' });
      }

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: request.user.profileId,
        action: 'claim_decision',
        resource_type: 'claims',
        resource_id: id,
        old_values: { status: oldStatus },
        new_values: {
          status: newStatus,
          amount_approved: amount_approved ?? null,
          decision_reason: decision_reason ?? null,
        },
        created_at: new Date().toISOString(),
      });

      // Notify patient
      const notificationMessage =
        newStatus === 'approved'
          ? `Your claim (ID: ${id}) has been approved for amount ₹${amount_approved?.toLocaleString()}.`
          : `Your claim (ID: ${id}) has been rejected. Reason: ${decision_reason}`;

      await supabaseAdmin.from('notifications').insert({
        profile_id: existing.patient_id,
        type: 'claim_decision',
        title: `Claim ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        message: notificationMessage,
        reference_type: 'claims',
        reference_id: id,
        is_read: false,
        created_at: new Date().toISOString(),
      });

      return reply.send({
        data: updated,
        message: `Claim ${newStatus} successfully`,
      });
    },
  );

  /**
   * PATCH /claims/:id/mark-paid
   * Mark an approved claim as paid (admin/insurer only).
   */
  fastify.patch(
    '/claims/:id/mark-paid',
    { preHandler: [authenticate, requireRole(['admin', 'insurer'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      // Fetch current claim
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('claims')
        .select('id, status, amount_approved, patient_id')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return reply.status(404).send({ error: 'Claim not found' });
      }

      if (existing.status !== 'approved') {
        return reply.status(409).send({
          error: `Only approved claims can be marked as paid. Current status: ${existing.status}`,
        });
      }

      // Update to paid
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('claims')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, status, amount_approved, paid_at')
        .single();

      if (updateError || !updated) {
        request.log.error(updateError, 'claims mark-paid error');
        return reply.status(500).send({ error: 'Failed to mark claim as paid' });
      }

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: request.user.profileId,
        action: 'claim_paid',
        resource_type: 'claims',
        resource_id: id,
        old_values: { status: 'approved' },
        new_values: { status: 'paid' },
        created_at: new Date().toISOString(),
      });

      // Notify patient
      await supabaseAdmin.from('notifications').insert({
        profile_id: existing.patient_id,
        type: 'claim_paid',
        title: 'Claim Payment Processed',
        message: `Your approved claim (ID: ${id}) of amount ₹${(existing.amount_approved as number)?.toLocaleString()} has been marked as paid.`,
        reference_type: 'claims',
        reference_id: id,
        is_read: false,
        created_at: new Date().toISOString(),
      });

      return reply.send({
        data: updated,
        message: 'Claim marked as paid successfully',
      });
    },
  );
}
