import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const DecisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  decision_reason: z.string().optional(),
}).refine(data => {
  if (data.status === 'rejected' && (!data.decision_reason || data.decision_reason.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Decision reason is required when rejecting a request',
  path: ['decision_reason'],
});

export const familyRequestRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireRole('admin'));

  // GET /family-requests - list pending/all family member enrollment requests
  fastify.get('/', async (request, reply) => {
    const query = request.query as { status?: string };

    let q = supabaseAdmin
      .from('family_members')
      .select('*, patients(id, full_name, email, phone)')
      .order('created_at', { ascending: false });

    if (query.status) {
      q = q.eq('status', query.status);
    }

    const { data, error } = await q;
    if (error) {
      return reply.status(500).send({ success: false, error: error.message });
    }

    return { success: true, data };
  });

  // PATCH /family-requests/:id/decision - approve or reject
  fastify.patch('/:id/decision', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parse = DecisionSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ success: false, error: parse.error.flatten() });
    }

    const { status, decision_reason } = parse.data;
    const { profileId } = request.user;

    // Get current record
    const { data: current, error: getError } = await supabaseAdmin
      .from('family_members')
      .select('*, patients(id, profile_id, full_name)')
      .eq('id', id)
      .single();

    if (getError || !current) {
      return reply.status(404).send({ success: false, error: 'Family member request not found' });
    }

    // Update family_members table
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('family_members')
      .update({
        status,
        reviewer_id: profileId,
        decision_reason: decision_reason || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return reply.status(500).send({ success: false, error: updateError.message });
    }

    // Log to audit_logs
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: profileId,
      action: `family_request_${status}`,
      table_name: 'family_members',
      record_id: id,
      old_value: { status: current.status },
      new_value: { status, decision_reason },
    });

    // Notify primary patient
    if (current.patients?.profile_id) {
      await supabaseAdmin.from('notifications').insert({
        recipient_id: current.patients.profile_id,
        title: `Family Member Enrollment ${status.toUpperCase()}`,
        body: status === 'approved'
          ? `Your family member request for ${current.full_name} has been approved.`
          : `Your family member request for ${current.full_name} was rejected. Reason: ${decision_reason}`,
        type: 'family_request',
        reference_id: id,
        reference_table: 'family_members',
      });
    }

    return {
      success: true,
      data: updated,
      message: `Family member request has been ${status}`,
    };
  });
};
