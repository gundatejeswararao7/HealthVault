import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { AuthenticatedUser } from '../../../../shared/types/index';

const profileUpdateSchema = z.object({
  full_name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const profileSetupSchema = z.object({
  full_name: z.string(),
  date_of_birth: z.string(),
  gender: z.string(),
  phone: z.string(),
  address: z.string(),
  email: z.string().email(),
});

const familyMemberSchema = z.object({
  full_name: z.string(),
  relationship: z.string(),
  date_of_birth: z.string(),
});

export default async function profileRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/profile', async (request, reply) => {
    const user = request.user as AuthenticatedUser;
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.profileId)
      .single();

    if (profileError || !profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('profile_id', user.profileId)
      .single();

    return { data: { profile, patient: patient || null } };
  });

  fastify.put('/profile', async (request, reply) => {
    const user = request.user as AuthenticatedUser;
    const parsed = profileUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input data' });
    }

    const { data: patient, error: patientFetchError } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', user.profileId)
      .single();

    if (patientFetchError || !patient) {
       return reply.status(404).send({ error: 'Patient record not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('patients')
      .update(parsed.data)
      .eq('id', patient.id)
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to update profile' });
    }

    return { data, message: 'Profile updated successfully' };
  });

  fastify.post('/profile/setup', async (request, reply) => {
    const user = request.user as AuthenticatedUser;
    const parsed = profileSetupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input data', details: parsed.error.issues });
    }

    const { data: existingPatient } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('profile_id', user.profileId)
      .maybeSingle();

    if (existingPatient) {
      return reply.status(400).send({ error: 'Patient record already exists' });
    }

    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .insert({
        profile_id: user.profileId,
        ...parsed.data
      })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to setup patient record' });
    }

    return { data: patient, message: 'Profile setup complete' };
  });

  fastify.get('/profile/family-members', async (request, reply) => {
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
      .from('family_members')
      .select('*')
      .eq('primary_patient_id', patient.id);

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch family members' });
    }

    return { data };
  });

  fastify.post('/profile/family-members', async (request, reply) => {
    const user = request.user as AuthenticatedUser;
    const parsed = familyMemberSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input data' });
    }

    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', user.profileId)
      .single();

    if (patientError || !patient) {
      return reply.status(404).send({ error: 'Patient not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('family_members')
      .insert({
        primary_patient_id: patient.id,
        ...parsed.data,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to add family member' });
    }

    return { data, message: 'Family member added' };
  });
}
