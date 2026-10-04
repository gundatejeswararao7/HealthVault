import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { requireRole } from '../middleware/requireRole';

const addProviderSchema = z.object({
  profile_id: z.string().uuid(),
  designation: z.string().min(1)
});

const updateStatusSchema = z.object({
  status: z.enum(['active', 'suspended'])
});

export default async function hospitalsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', async (req, reply) => {
    return requireRole(['admin', 'insurer'])(req, reply);
  });

  fastify.get('/hospitals', async (request: FastifyRequest<{ Querystring: { status?: string } }>, reply) => {
    let query = supabaseAdmin.from('hospitals').select('*');
    if (request.query.status) {
      query = query.eq('status', request.query.status);
    }
    const { data, error } = await query;
    if (error) return reply.status(500).send({ success: false, error: error.message });
    return { success: true, data };
  });

  fastify.get('/hospitals/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { data: hospital, error: hospError } = await supabaseAdmin.from('hospitals').select('*').eq('id', request.params.id).single();
    if (hospError) return reply.status(500).send({ success: false, error: hospError.message });

    const { count: patientCount } = await supabaseAdmin.from('patient_hospital_links').select('*', { count: 'exact', head: true }).eq('hospital_id', request.params.id).eq('status', 'active');
    const { count: billingCount } = await supabaseAdmin.from('billing_cases').select('*', { count: 'exact', head: true }).eq('hospital_id', request.params.id).in('status', ['open', 'under_review']);

    return { success: true, data: { ...hospital, linked_patients_count: patientCount || 0, active_billing_cases_count: billingCount || 0 } };
  });

  fastify.patch('/hospitals/:id/status', async (request: FastifyRequest<{ Params: { id: string }, Body: any }>, reply) => {
    try {
      const parsed = updateStatusSchema.parse(request.body);
      const { data, error } = await supabaseAdmin.from('hospitals').update({ status: parsed.status }).eq('id', request.params.id).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
    }
  });

  fastify.post('/hospitals/:id/users', async (request: FastifyRequest<{ Params: { id: string }, Body: any }>, reply) => {
    try {
      const parsed = addProviderSchema.parse(request.body);
      const { data, error } = await supabaseAdmin.from('hospital_users').insert({
        hospital_id: request.params.id,
        profile_id: parsed.profile_id,
        designation: parsed.designation,
        is_active: true
      }).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
    }
  });

  fastify.delete('/hospitals/:id/users/:profileId', async (request: FastifyRequest<{ Params: { id: string, profileId: string } }>, reply) => {
    const { data, error } = await supabaseAdmin.from('hospital_users').update({ is_active: false })
      .eq('hospital_id', request.params.id)
      .eq('profile_id', request.params.profileId)
      .select().single();
    if (error) return reply.status(500).send({ success: false, error: error.message });
    return { success: true, data };
  });
}
