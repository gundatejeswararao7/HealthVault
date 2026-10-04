import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { AuthenticatedUser } from '../../../../shared/types/index';

const createPolicySchema = z.object({
  plan_id: z.string(),
  start_date: z.string(),
  end_date: z.string(),
});

export default async function policiesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/policies', async (request, reply) => {
    const user = request.user as AuthenticatedUser;
    
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', user.profileId)
      .single();

    if (patientError || !patient) {
      return reply.status(404).send({ error: 'Patient not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('insurance_policies')
      .select('*, insurance_plans(*)')
      .eq('patient_id', patient.id)
      .eq('is_active', true);

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch policies' });
    }

    return { data };
  });

  fastify.post('/policies', async (request, reply) => {
    const user = request.user as AuthenticatedUser;
    const parsed = createPolicySchema.safeParse(request.body);
    
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input data' });
    }

    const { plan_id, start_date, end_date } = parsed.data;

    const { data: plan, error: planError } = await supabaseAdmin
      .from('insurance_plans')
      .select('id, is_active')
      .eq('id', plan_id)
      .single();

    if (planError || !plan || !plan.is_active) {
      return reply.status(400).send({ error: 'Invalid or inactive plan' });
    }

    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', user.profileId)
      .single();

    if (patientError || !patient) {
      return reply.status(404).send({ error: 'Patient not found' });
    }

    const policy_number = `POL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const { data, error } = await supabaseAdmin
      .from('insurance_policies')
      .insert({
        patient_id: patient.id,
        plan_id,
        start_date,
        end_date,
        is_active: true,
        policy_number
      })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to create policy' });
    }

    return { data, message: 'Policy created successfully' };
  });

  fastify.get<{ Params: { id: string } }>('/policies/:id', async (request, reply) => {
    const user = request.user as AuthenticatedUser;
    const { id } = request.params;

    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', user.profileId)
      .single();

    if (patientError || !patient) {
      return reply.status(404).send({ error: 'Patient not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('insurance_policies')
      .select('*, insurance_plans(*)')
      .eq('id', id)
      .eq('patient_id', patient.id)
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: 'Policy not found' });
    }

    return { data };
  });
}
