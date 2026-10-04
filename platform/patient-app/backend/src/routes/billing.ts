import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { AuthenticatedUser } from '../../../../shared/types/index';

export default async function billingRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/billing', async (request, reply) => {
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
      .from('billing_cases')
      .select('id, title, total_amount, insurer_paid, patient_balance, status, opened_at, hospitals(name)')
      .eq('patient_id', patient.id)
      .order('opened_at', { ascending: false });

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch billing cases' });
    }

    return { data };
  });

  fastify.get<{ Params: { id: string } }>('/billing/:id', async (request, reply) => {
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
      .from('billing_cases')
      .select('*, billing_items(*), hospitals(*)')
      .eq('id', id)
      .eq('patient_id', patient.id)
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: 'Billing case not found' });
    }

    return { data };
  });

  fastify.get('/billing/summary', async (request, reply) => {
    const user = request.user as AuthenticatedUser;
    
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', user.profileId)
      .single();

    if (patientError || !patient) {
      return reply.status(404).send({ error: 'Patient not found' });
    }

    const { data: cases, error: casesError } = await supabaseAdmin
      .from('billing_cases')
      .select('total_amount, insurer_paid, patient_balance')
      .eq('patient_id', patient.id);

    if (casesError) {
      return reply.status(500).send({ error: 'Failed to fetch billing summary data' });
    }

    const { count: activePoliciesCount } = await supabaseAdmin
      .from('insurance_policies')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patient.id)
      .eq('is_active', true);

    const { count: pendingClaimsCount } = await supabaseAdmin
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patient.id)
      .in('status', ['submitted', 'under_review']);

    const summary = {
      total_billed: cases.reduce((acc, curr) => acc + (curr.total_amount || 0), 0),
      total_insurer_paid: cases.reduce((acc, curr) => acc + (curr.insurer_paid || 0), 0),
      total_patient_balance: cases.reduce((acc, curr) => acc + (curr.patient_balance || 0), 0),
      active_policies: activePoliciesCount || 0,
      pending_claims: pendingClaimsCount || 0
    };

    return { data: summary };
  });
}
