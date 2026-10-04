import { FastifyInstance, FastifyRequest } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';

export default async function patientsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: { patientId: string } }>('/patients/:patientId', async (request, reply) => {
    const user = request.user as any;
    const { patientId } = request.params;

    const { data: link, error: linkError } = await supabaseAdmin
      .from('patient_hospital_links')
      .select('id')
      .eq('patient_id', patientId)
      .eq('hospital_id', user.hospitalId)
      .eq('is_active', true)
      .single();

    if (linkError || !link) {
      return reply.status(403).send({ error: 'Patient not linked or inactive' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', patientId) // Assumes profile id is patient id
      .single();

    if (profileError) throw profileError;

    const { data: policies } = await supabaseAdmin
      .from('insurance_policies')
      .select('*, insurance_plans(*)')
      .eq('patient_id', patientId)
      .eq('is_active', true);

    const { data: billing_cases } = await supabaseAdmin
      .from('billing_cases')
      .select('*')
      .eq('patient_id', patientId)
      .eq('hospital_id', user.hospitalId);

    return reply.send({
      patient: profile,
      policies: policies || [],
      billing_cases: billing_cases || []
    });
  });
}
