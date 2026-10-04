import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { requireRole } from '../middleware/requireRole';

const decisionSchema = z.object({
  status: z.enum(['approved', 'rejected'])
});

export default async function familyRequestsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', async (req, reply) => {
    return requireRole(['admin', 'insurer'])(req, reply);
  });

  fastify.get('/family-requests', async (_request, reply) => {
    const { data, error } = await supabaseAdmin.from('family_member_requests')
      .select('*, patients!primary_patient_id(full_name)')
      .eq('status', 'pending');
    
    if (error) return reply.status(500).send({ success: false, error: error.message });
    return { success: true, data };
  });

  fastify.get('/family-requests/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { data, error } = await supabaseAdmin.from('family_member_requests')
      .select('*, patients!primary_patient_id(*)')
      .eq('id', request.params.id)
      .single();
    
    if (error) return reply.status(500).send({ success: false, error: error.message });
    return { success: true, data };
  });

  fastify.patch('/family-requests/:id/decision', async (request: FastifyRequest<{ Params: { id: string }, Body: any }>, reply) => {
    const profileId = (request as any).user?.id;
    try {
      const parsed = decisionSchema.parse(request.body);
      
      const { data: requestRecord, error: fetchError } = await supabaseAdmin.from('family_member_requests').select('*').eq('id', request.params.id).single();
      if (fetchError) throw fetchError;

      const { data, error } = await supabaseAdmin.from('family_member_requests').update({
        status: parsed.status,
        reviewed_by: profileId,
        reviewed_at: new Date().toISOString()
      }).eq('id', request.params.id).select().single();

      if (error) throw error;

      await supabaseAdmin.from('audit_logs').insert({
        actor_id: profileId,
        action: `family_request_${parsed.status}`,
        entity_type: 'family_member_requests',
        entity_id: request.params.id
      });

      await supabaseAdmin.from('notifications').insert({
        profile_id: requestRecord.primary_patient_id,
        title: `Family Member Request ${parsed.status === 'approved' ? 'Approved' : 'Rejected'}`,
        body: `Your request to add ${requestRecord.member_name} has been ${parsed.status}.`
      });

      return { success: true, data };
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
    }
  });
}
