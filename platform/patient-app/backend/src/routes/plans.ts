import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';

export default async function plansRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/plans', async (_request, reply) => {
    const { data, error } = await supabaseAdmin
      .from('insurance_plans')
      .select('*')
      .eq('is_active', true);

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch plans' });
    }

    return { data };
  });

  fastify.get<{ Params: { id: string } }>('/plans/:id', async (request, reply) => {
    const { id } = request.params;
    const { data, error } = await supabaseAdmin
      .from('insurance_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: 'Plan not found' });
    }

    return { data };
  });
}
