import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';

const submitClaimSchema = z.object({
  billing_case_id: z.string().uuid(),
  policy_id: z.string().uuid(),
  amount_claimed: z.number().positive()
});

export default async function claimsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/claims', async (request: FastifyRequest, reply) => {
    const user = request.user as any;
    const { status } = request.query as { status?: string };

    let query = supabaseAdmin
      .from('claims')
      .select('*, profiles!claims_patient_id_fkey(full_name), insurance_policies(policy_number), billing_cases!inner(title, hospital_id)')
      .eq('billing_cases.hospital_id', user.hospitalId);

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    // Format response to remove nested inner join field conceptually if needed
    return reply.send(data);
  });

  fastify.post('/claims', async (request: FastifyRequest, reply) => {
    const user = request.user as any;
    const body = submitClaimSchema.parse(request.body);

    const { data: caseInfo, error: caseError } = await supabaseAdmin
      .from('billing_cases')
      .select('status, patient_id, hospital_id')
      .eq('id', body.billing_case_id)
      .single();

    if (caseError || !caseInfo) return reply.status(404).send({ error: 'Billing case not found' });
    if (caseInfo.hospital_id !== user.hospitalId) return reply.status(403).send({ error: 'Forbidden' });
    if (caseInfo.status !== 'open') return reply.status(400).send({ error: 'Case not open' });

    const { data: policy, error: policyError } = await supabaseAdmin
      .from('insurance_policies')
      .select('*, insurance_plans(coverage_limit)')
      .eq('id', body.policy_id)
      .eq('patient_id', caseInfo.patient_id)
      .eq('is_active', true)
      .single();

    if (policyError || !policy) return reply.status(400).send({ error: 'Invalid or inactive policy' });

    const coverageLimit = (policy.insurance_plans as any)?.coverage_limit || 0;
    if (body.amount_claimed > coverageLimit) {
      return reply.status(400).send({ error: 'Amount claimed exceeds policy limit' });
    }

    const { data: existingClaim } = await supabaseAdmin
      .from('claims')
      .select('id')
      .eq('billing_case_id', body.billing_case_id)
      .single();

    if (existingClaim) return reply.status(400).send({ error: 'Claim already exists for this case' });

    const { data: claim, error: insertError } = await supabaseAdmin
      .from('claims')
      .insert({
        billing_case_id: body.billing_case_id,
        patient_id: caseInfo.patient_id,
        policy_id: body.policy_id,
        submitted_by: user.profileId,
        amount_claimed: body.amount_claimed,
        status: 'submitted'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    await supabaseAdmin
      .from('billing_cases')
      .update({ status: 'submitted' })
      .eq('id', body.billing_case_id);

    await supabaseAdmin.from('notifications').insert({
      user_id: caseInfo.patient_id,
      title: 'Claim Submitted',
      message: `A claim for ${body.amount_claimed} has been submitted.`
    });

    return reply.status(201).send(claim);
  });

  fastify.get<{ Params: { id: string } }>('/claims/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    const { data: claim, error } = await supabaseAdmin
      .from('claims')
      .select('*, billing_cases!inner(*, billing_items(*)), documents(*)')
      .eq('id', id)
      .eq('billing_cases.hospital_id', user.hospitalId)
      .single();

    if (error || !claim) return reply.status(404).send({ error: 'Claim not found' });
    return reply.send(claim);
  });
}
