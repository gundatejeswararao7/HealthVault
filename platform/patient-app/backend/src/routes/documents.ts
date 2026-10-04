import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { AuthenticatedUser } from '../../../../shared/types/index';

export default async function documentsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/documents', async (request, reply) => {
    const user = request.user as AuthenticatedUser;
    
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('profile_id', user.profileId)
      .single();

    if (patientError || !patient) {
      return reply.status(404).send({ error: 'Patient not found' });
    }

    // List documents owned by patient or linked to their billing cases
    const { data: billingCases } = await supabaseAdmin
      .from('billing_cases')
      .select('id')
      .eq('patient_id', patient.id);

    const billingCaseIds = billingCases?.map(bc => bc.id) || [];

    let query = supabaseAdmin
      .from('documents')
      .select('*');

    if (billingCaseIds.length > 0) {
      query = query.or(`owner_id.eq.${patient.id},billing_case_id.in.(${billingCaseIds.join(',')})`);
    } else {
      query = query.eq('owner_id', patient.id);
    }

    const { data, error } = await query;

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch documents' });
    }

    return { data };
  });

  fastify.get<{ Params: { id: string } }>('/documents/:id/download-url', async (request, reply) => {
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

    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (docError || !doc) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    const { data, error } = await supabaseAdmin
      .storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 3600);

    if (error || !data) {
      return reply.status(500).send({ error: 'Failed to generate download URL' });
    }

    return { data: { signedUrl: data.signedUrl } };
  });
}
