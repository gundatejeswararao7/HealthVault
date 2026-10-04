import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { AuthenticatedUser } from '../../../../shared/types/index';

export default async function claimsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/claims', async (request, reply) => {
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
      .from('claims')
      .select('*, billing_cases(title)')
      .eq('patient_id', patient.id)
      .order('submitted_at', { ascending: false });

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch claims' });
    }

    return { data };
  });

  fastify.get<{ Params: { id: string } }>('/claims/:id', async (request, reply) => {
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
      .from('claims')
      .select('*, billing_cases(*), insurance_policies(*)')
      .eq('id', id)
      .eq('patient_id', patient.id)
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: 'Claim not found' });
    }

    return { data };
  });
}
