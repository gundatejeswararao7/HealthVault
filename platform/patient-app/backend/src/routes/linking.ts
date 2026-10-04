import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { supabaseAdmin } from '../lib/supabase';
import { AuthenticatedUser } from '../../../../shared/types/index';

export default async function linkingRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/linking/generate', async (request, reply) => {
    const user = request.user as AuthenticatedUser;
    
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', user.profileId)
      .single();

    if (patientError || !patient) {
      return reply.status(404).send({ error: 'Patient not found' });
    }

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('linking_codes')
      .insert({
        patient_id: patient.id,
        code,
        expires_at,
        used: false
      })
      .select('code, expires_at')
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to generate code' });
    }

    return { data, message: 'Linking code generated' };
  });

  fastify.get('/linking/codes', async (request, reply) => {
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
      .from('linking_codes')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false });

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch codes' });
    }

    return { data };
  });

  fastify.get('/linking/links', async (request, reply) => {
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
      .from('patient_hospital_links')
      .select('*, hospitals(*)')
      .eq('patient_id', patient.id)
      .eq('is_active', true);

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch links' });
    }

    return { data };
  });

  fastify.delete<{ Params: { id: string } }>('/linking/links/:id', async (request, reply) => {
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

    const { error } = await supabaseAdmin
      .from('patient_hospital_links')
      .update({ is_active: false })
      .eq('id', id)
      .eq('patient_id', patient.id);

    if (error) {
      return reply.status(500).send({ error: 'Failed to deactivate link' });
    }

    return { message: 'Link deactivated successfully' };
  });
}
