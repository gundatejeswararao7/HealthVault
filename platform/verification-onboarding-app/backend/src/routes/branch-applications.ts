import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { requireRole } from '../middleware/requireRole';

const createAppSchema = z.object({
  hospital_name: z.string().min(1),
  registration_number: z.string().min(1),
  contact_email: z.string().email(),
  contact_phone: z.string().min(1),
  address: z.string().min(1),
});

const decisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reason: z.string().optional()
});

export default async function branchApplicationRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { status?: string, page?: string, limit?: string } }>('/branch-applications', { preHandler: requireRole(['admin', 'insurer']) }, async (request, reply) => {
    const page = parseInt(request.query.page || '1');
    const limit = parseInt(request.query.limit || '20');
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin.from('hospital_branch_applications').select('*', { count: 'exact' });
    if (request.query.status) query = query.eq('status', request.query.status);

    const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
    if (error) return reply.status(500).send({ success: false, error: error.message });

    return { success: true, data, count, page, limit };
  });

  fastify.get<{ Params: { id: string } }>('/branch-applications/:id', { preHandler: requireRole(['admin', 'insurer']) }, async (request, reply) => {
    const { data, error } = await supabaseAdmin.from('hospital_branch_applications').select('*').eq('id', request.params.id).single();
    if (error) return reply.status(500).send({ success: false, error: error.message });
    return { success: true, data };
  });

  fastify.post('/branch-applications', async (request: FastifyRequest<{ Body: any }>, reply) => {
    try {
      const parsed = createAppSchema.parse(request.body);
      const profileId = (request as any).user?.id;
      
      const { data, error } = await supabaseAdmin.from('hospital_branch_applications').insert({
        ...parsed,
        submitted_by: profileId,
        status: 'pending'
      }).select().single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
    }
  });

  fastify.patch<{ Params: { id: string }, Body: any }>('/branch-applications/:id/decision', { preHandler: requireRole(['admin', 'insurer']) }, async (request, reply) => {
    try {
      const parsed = decisionSchema.parse(request.body);
      const profileId = (request as any).user?.id;

      const { data: app, error: fetchError } = await supabaseAdmin.from('hospital_branch_applications').select('*').eq('id', request.params.id).single();
      if (fetchError) throw fetchError;

      const { data: updatedApp, error: updateError } = await supabaseAdmin.from('hospital_branch_applications').update({
        status: parsed.status,
        reviewed_by: profileId,
        reviewed_at: new Date().toISOString()
      }).eq('id', request.params.id).select().single();

      if (updateError) throw updateError;

      if (parsed.status === 'approved') {
        await supabaseAdmin.from('hospitals').insert({
          name: app.hospital_name,
          registration_number: app.registration_number,
          contact_email: app.contact_email,
          contact_phone: app.contact_phone,
          address: app.address,
          status: 'active'
        });
      }

      return { success: true, data: updatedApp };
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
    }
  });
}
