import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin, createUserClient } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const UpdateProfileSchema = z.object({
  full_name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  address: z.string().min(5).optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
});

const AddFamilyMemberSchema = z.object({
  full_name: z.string().min(2),
  relationship: z.string().min(2),
  date_of_birth: z.string(),
  email: z.string().email(),
});

const AddPolicySchema = z.object({
  policy_number: z.string().min(3),
  provider_name: z.string().min(2),
  coverage_type: z.string().min(2),
  coverage_limit: z.number().positive(),
  deductible: z.number().nonnegative().default(0),
  premium: z.number().positive(),
  start_date: z.string(),
  end_date: z.string(),
});

export const profileRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireAuth);

  // GET /profile - get profile & patient data
  fastify.get('/', async (request, reply) => {
    const { profile, user } = request.user!;

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('profile_id', profile.id)
      .single();

    return {
      data: {
        profile,
        patient: patient || null,
        email: user.email,
      },
    };
  });

  // PUT /profile - update patient details
  fastify.put('/', async (request, reply) => {
    const parse = UpdateProfileSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.flatten() });
    }

    const { profile, token } = request.user!;
    const supabase = createUserClient(token);

    // Upsert patient row
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    let result;
    if (existingPatient) {
      result = await supabase
        .from('patients')
        .update(parse.data)
        .eq('profile_id', profile.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('patients')
        .insert({
          profile_id: profile.id,
          email: request.user!.user.email!,
          ...parse.data,
        })
        .select()
        .single();
    }

    if (result.error) {
      return reply.status(500).send({ error: result.error.message });
    }

    return { data: result.data };
  });

  // GET /profile/family-members
  fastify.get('/family-members', async (request, reply) => {
    const { profile } = request.user!;

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (!patient) return { data: [] };

    const { data: members, error } = await supabaseAdmin
      .from('family_members')
      .select('*')
      .eq('primary_patient_id', patient.id)
      .order('created_at', { ascending: false });

    if (error) {
      return reply.status(500).send({ error: error.message });
    }
    return { data: members };
  });

  // POST /profile/family-members - submit family enrollment request
  fastify.post('/family-members', async (request, reply) => {
    const parse = AddFamilyMemberSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.flatten() });
    }

    const { profile, token } = request.user!;
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (!patient) {
      return reply.status(400).send({ error: 'Primary patient record does not exist' });
    }

    const supabase = createUserClient(token);
    const { data: familyMember, error } = await supabase
      .from('family_members')
      .insert({
        primary_patient_id: patient.id,
        full_name: parse.data.full_name,
        relationship: parse.data.relationship,
        date_of_birth: parse.data.date_of_birth,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.status(201).send({
      data: familyMember,
      message: 'Family member enrollment request submitted for review',
    });
  });

  // GET /profile/policies
  fastify.get('/policies', async (request, reply) => {
    const { profile, token } = request.user!;
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (!patient) return { data: [] };

    const supabase = createUserClient(token);
    const { data: policies, error } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false });

    if (error) {
      return reply.status(500).send({ error: error.message });
    }
    return { data: policies };
  });

  // POST /profile/policies
  fastify.post('/policies', async (request, reply) => {
    const parse = AddPolicySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.flatten() });
    }

    const { profile, token } = request.user!;
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (!patient) {
      return reply.status(400).send({ error: 'Patient profile not set up' });
    }

    const supabase = createUserClient(token);
    const { data: policy, error } = await supabase
      .from('insurance_policies')
      .insert({
        patient_id: patient.id,
        ...parse.data,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.status(201).send({ data: policy });
  });
};
