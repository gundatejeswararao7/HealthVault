import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin, createUserClient } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const CreateClaimSchema = z.object({
  policy_id: z.string().uuid(),
  case_id: z.string().uuid(),
  amount_claimed: z.number().positive(),
});

export const claimRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireRole('patient', 'family_member'));

  // POST /claims - create draft claim
  fastify.post('/', async (request, reply) => {
    const parseResult = CreateClaimSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() });
    }

    const { policy_id, case_id, amount_claimed } = parseResult.data;
    const { profile, token } = request.user!;

    // Resolve patient id
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (patientError || !patient) {
      return reply.status(404).send({ error: 'Patient record not found' });
    }

    // Business check: policy belongs to patient and is active
    const { data: policy, error: policyError } = await supabaseAdmin
      .from('insurance_policies')
      .select('*')
      .eq('id', policy_id)
      .eq('patient_id', patient.id)
      .eq('is_active', true)
      .single();

    if (policyError || !policy) {
      return reply.status(400).send({ error: 'Selected policy does not exist, is inactive, or does not belong to you' });
    }

    // Business check: verify case belongs to patient
    const { data: medicalCase, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('*')
      .eq('id', case_id)
      .eq('patient_id', patient.id)
      .single();

    if (caseError || !medicalCase) {
      return reply.status(400).send({ error: 'Referenced case does not belong to this patient' });
    }

    // Business check: check no duplicate active claim exists for this case
    const { data: existingClaims } = await supabaseAdmin
      .from('claims')
      .select('id, status')
      .eq('case_id', case_id)
      .not('status', 'in', '("rejected")');

    if (existingClaims && existingClaims.length > 0) {
      return reply.status(409).send({ error: 'An active or submitted claim already exists for this case' });
    }

    const supabase = createUserClient(token);
    const { data: claim, error: insertError } = await supabase
      .from('claims')
      .insert({
        patient_id: patient.id,
        policy_id,
        case_id,
        amount_claimed,
        status: 'draft',
      })
      .select()
      .single();

    if (insertError) {
      return reply.status(500).send({ error: insertError.message });
    }

    return reply.status(201).send({ data: claim });
  });

  // GET /claims - list patient's claims
  fastify.get('/', async (request, reply) => {
    const { profile, token } = request.user!;

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (!patient) {
      return { data: [] };
    }

    const supabase = createUserClient(token);
    const { data: claims, error } = await supabase
      .from('claims')
      .select('*, insurance_policies(policy_number, provider_name), cases(diagnosis)')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false });

    if (error) {
      return reply.status(500).send({ error: error.message });
    }
    return { data: claims };
  });

  // GET /claims/:id - claim details
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { profile, token } = request.user!;

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (!patient) {
      return reply.status(404).send({ error: 'Patient record not found' });
    }

    const supabase = createUserClient(token);
    const { data: claim, error } = await supabase
      .from('claims')
      .select('*, insurance_policies(*), cases(*)')
      .eq('id', id)
      .eq('patient_id', patient.id)
      .single();

    if (error || !claim) {
      return reply.status(404).send({ error: 'Claim not found or access denied' });
    }

    return { data: claim };
  });

  // PATCH /claims/:id/submit - submit a draft claim
  fastify.patch('/:id/submit', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { profile, token } = request.user!;

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (!patient) {
      return reply.status(404).send({ error: 'Patient not found' });
    }

    const supabase = createUserClient(token);
    const { data: updated, error } = await supabase
      .from('claims')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('patient_id', patient.id)
      .eq('status', 'draft')
      .select()
      .single();

    if (error || !updated) {
      return reply.status(400).send({ error: 'Claim could not be submitted. Must be in draft status.' });
    }

    return { data: updated, message: 'Claim submitted successfully for review' };
  });

  // GET /claims/:id/treatment-items
  fastify.get('/:id/treatment-items', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { profile, token } = request.user!;

    const supabase = createUserClient(token);
    const { data: claim } = await supabase
      .from('claims')
      .select('case_id')
      .eq('id', id)
      .single();

    if (!claim) {
      return reply.status(404).send({ error: 'Claim not found' });
    }

    const { data: items, error } = await supabaseAdmin
      .from('treatment_items')
      .select('*')
      .eq('case_id', claim.case_id);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return { data: items };
  });
};
