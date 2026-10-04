import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { requireRole } from '../middleware/requireRole';

const createPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  coverage_type: z.string().min(1),
  coverage_limit: z.number().positive(),
  deductible: z.number().min(0),
  premium_monthly: z.number().positive(),
  max_family_members: z.number().min(0),
});

const updatePlanSchema = createPlanSchema.partial();

export default async function plansRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', async (req, reply) => {
    return requireRole(['admin', 'insurer'])(req, reply);
  });

  fastify.get('/plans', async (request: FastifyRequest<{ Querystring: { is_active?: string, coverage_type?: string } }>, reply) => {
    let query = supabaseAdmin.from('insurance_plans').select('*');
    if (request.query.is_active !== undefined) {
      query = query.eq('is_active', request.query.is_active === 'true');
    }
    if (request.query.coverage_type) {
      query = query.eq('coverage_type', request.query.coverage_type);
    }
    
    const { data, error } = await query;
    if (error) {
      return reply.status(500).send({ success: false, error: error.message });
    }
    return { success: true, data };
  });

  fastify.post('/plans', async (request: FastifyRequest<{ Body: z.infer<typeof createPlanSchema> }>, reply) => {
    const profileId = (request as any).user?.id;
    try {
      const parsedBody = createPlanSchema.parse(request.body);
      const { data, error } = await supabaseAdmin.from('insurance_plans').insert({
        ...parsedBody,
        created_by: profileId,
        is_active: true
      }).select().single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
    }
  });

  fastify.get('/plans/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { data: plan, error: planError } = await supabaseAdmin.from('insurance_plans').select('*').eq('id', request.params.id).single();
    if (planError) {
      return reply.status(500).send({ success: false, error: planError.message });
    }
    
    const { count, error: policyError } = await supabaseAdmin
      .from('insurance_policies')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', request.params.id)
      .eq('is_active', true);
      
    if (policyError) {
      return reply.status(500).send({ success: false, error: policyError.message });
    }

    return { success: true, data: { ...plan, active_policies_count: count } };
  });

  fastify.put('/plans/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: z.infer<typeof updatePlanSchema> }>, reply) => {
    try {
      const parsedBody = updatePlanSchema.parse(request.body);
      const { data, error } = await supabaseAdmin.from('insurance_plans').update(parsedBody).eq('id', request.params.id).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
    }
  });

  fastify.patch('/plans/:id/toggle', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { data: plan, error: getError } = await supabaseAdmin.from('insurance_plans').select('is_active').eq('id', request.params.id).single();
    if (getError) {
      return reply.status(500).send({ success: false, error: getError.message });
    }
    const { data, error } = await supabaseAdmin.from('insurance_plans').update({ is_active: !plan.is_active }).eq('id', request.params.id).select().single();
    if (error) {
      return reply.status(500).send({ success: false, error: error.message });
    }
    return { success: true, data };
  });
}
