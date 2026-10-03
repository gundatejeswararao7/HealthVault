import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const decisionSchema = z.object({
  status: z.enum(['approved', 'rejected', 'under_review']),
  decision_reason: z.string().min(1).max(2000).optional(),
}).refine(
  (d) => d.status !== 'rejected' || (d.decision_reason && d.decision_reason.length > 0),
  { message: 'decision_reason is required when rejecting', path: ['decision_reason'] },
);

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export default async function familyRequestRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /family-requests
   * List all family member enrollment requests (insurer/admin).
   * Supports filter by status, patient_id, date range.
   */
  fastify.get(
    '/family-requests',
    { preHandler: [authenticate, requireRole(['admin', 'insurer'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as Record<string, string | undefined>;
      const status = query['status'];
      const patientId = query['patient_id'];
      const dateFrom = query['date_from'];
      const dateTo = query['date_to'];
      const page = Math.max(1, parseInt(query['page'] ?? '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query['limit'] ?? '20', 10)));
      const offset = (page - 1) * limit;

      let q = supabaseAdmin
        .from('family_member_requests')
        .select(
          `
          id,
          status,
          decision_reason,
          relationship,
          created_at,
          updated_at,
          reviewer_id,
          primary_patient:profiles!family_member_requests_patient_id_fkey (
            id,
            full_name,
            email
          ),
          member_details
          `,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) q = q.eq('status', status);
      if (patientId) q = q.eq('patient_id', patientId);
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', dateTo);

      const { data, error, count } = await q;
      if (error) {
        request.log.error(error, 'family-requests list error');
        return reply.status(500).send({ error: 'Failed to fetch family member requests' });
      }

      return reply.send({
        data,
        pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
      });
    },
  );

  /**
   * GET /family-requests/:id
   * Full request details with primary patient info.
   */
  fastify.get(
    '/family-requests/:id',
    { preHandler: [authenticate, requireRole(['admin', 'insurer'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const { data, error } = await supabaseAdmin
        .from('family_member_requests')
        .select(
          `
          id,
          status,
          decision_reason,
          relationship,
          member_details,
          created_at,
          updated_at,
          reviewer_id,
          reviewed_at,
          primary_patient:profiles!family_member_requests_patient_id_fkey (
            id,
            full_name,
            email,
            phone,
            date_of_birth
          )
          `,
        )
        .eq('id', id)
        .single();

      if (error || !data) {
        return reply.status(404).send({ error: 'Family member request not found' });
      }

      return reply.send({ data });
    },
  );

  /**
   * PATCH /family-requests/:id/decision
   * Approve or reject a family member enrollment request (insurer/admin).
   * Logs to audit_logs and notifies primary patient.
   */
  fastify.patch(
    '/family-requests/:id/decision',
    { preHandler: [authenticate, requireRole(['admin', 'insurer'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const parsed = decisionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
      }

      const { status: newStatus, decision_reason } = parsed.data;

      // Fetch existing request
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('family_member_requests')
        .select('id, status, patient_id, relationship, member_details')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return reply.status(404).send({ error: 'Family member request not found' });
      }

      const oldStatus = existing.status as string;
      const patientId = existing.patient_id as string;

      // Update request
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('family_member_requests')
        .update({
          status: newStatus,
          decision_reason: decision_reason ?? null,
          reviewer_id: request.user.profileId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, status, decision_reason, reviewed_at')
        .single();

      if (updateError || !updated) {
        request.log.error(updateError, 'family_member_requests update error');
        return reply.status(500).send({ error: 'Failed to update request status' });
      }

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: request.user.profileId,
        action: 'family_member_request_decision',
        resource_type: 'family_member_requests',
        resource_id: id,
        old_values: { status: oldStatus },
        new_values: { status: newStatus, decision_reason: decision_reason ?? null },
        created_at: new Date().toISOString(),
      });

      // Notify primary patient
      const memberName =
        typeof existing.member_details === 'object' &&
        existing.member_details !== null &&
        'full_name' in (existing.member_details as object)
          ? (existing.member_details as Record<string, unknown>)['full_name']
          : 'family member';

      const notificationMessage =
        newStatus === 'approved'
          ? `Your family member enrollment request for ${memberName} (${existing.relationship}) has been approved.`
          : newStatus === 'rejected'
          ? `Your family member enrollment request for ${memberName} (${existing.relationship}) has been rejected. Reason: ${decision_reason}`
          : `Your family member enrollment request for ${memberName} (${existing.relationship}) is under review.`;

      await supabaseAdmin.from('notifications').insert({
        profile_id: patientId,
        type: 'family_member_request_update',
        title: `Family Member Request ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        message: notificationMessage,
        reference_type: 'family_member_requests',
        reference_id: id,
        is_read: false,
        created_at: new Date().toISOString(),
      });

      return reply.send({
        data: updated,
        message: `Family member request ${newStatus} successfully`,
      });
    },
  );
}
