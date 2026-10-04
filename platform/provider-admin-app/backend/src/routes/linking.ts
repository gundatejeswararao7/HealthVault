import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';

const connectSchema = z.object({
  code: z.string().min(1)
});

export default async function linkingRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/linking/connect', async (request: FastifyRequest, reply) => {
    const { code } = connectSchema.parse(request.body);
    const user = request.user as any;
    const hospitalId = user.hospitalId;

    const { data: linkingCode, error: codeError } = await supabaseAdmin
      .from('linking_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (codeError || !linkingCode) {
      return reply.status(404).send({ error: 'Code not found or expired' });
    }

    const patientId = linkingCode.patient_id;

    const { data: existingLink } = await supabaseAdmin
      .from('patient_hospital_links')
      .select('*')
      .eq('patient_id', patientId)
      .eq('hospital_id', hospitalId)
      .single();

    let linkId;
    if (existingLink) {
      if (existingLink.is_active) {
        return reply.status(200).send({ success: true, message: 'Already linked', patient_id: patientId, link_id: existingLink.id });
      } else {
        const { data: updatedLink, error: updateError } = await supabaseAdmin
          .from('patient_hospital_links')
          .update({ is_active: true, linking_code_id: linkingCode.id })
          .eq('id', existingLink.id)
          .select()
          .single();
        if (updateError) throw updateError;
        linkId = updatedLink.id;
      }
    } else {
      const { data: newLink, error: insertError } = await supabaseAdmin
        .from('patient_hospital_links')
        .insert({
          patient_id: patientId,
          hospital_id: hospitalId,
          linking_code_id: linkingCode.id,
          is_active: true
        })
        .select()
        .single();
      if (insertError) throw insertError;
      linkId = newLink.id;
    }

    await supabaseAdmin
      .from('linking_codes')
      .update({ used: true, used_by_hospital_id: hospitalId, used_at: new Date().toISOString() })
      .eq('id', linkingCode.id);

    // Get hospital name
    const { data: hospital } = await supabaseAdmin.from('hospitals').select('name').eq('id', hospitalId).single();
    const hospitalName = hospital?.name || 'A hospital';

    await supabaseAdmin.from('notifications').insert({
      user_id: patientId, // Assuming user_id maps to patient
      title: 'Hospital linked',
      message: `Hospital ${hospitalName} has accessed your profile`
    });

    return reply.status(200).send({ success: true, patient_id: patientId, link_id: linkId });
  });

  fastify.get('/linking/patients', async (request: FastifyRequest, reply) => {
    const user = request.user as any;
    const hospitalId = user.hospitalId;

    const { data, error } = await supabaseAdmin
      .from('patient_hospital_links')
      .select(`
        id, patient_id, linked_at, is_active,
        patients!inner(id),
        profiles!patient_hospital_links_patient_id_fkey(full_name, email)
      `)
      .eq('hospital_id', hospitalId);
      
    if (error) throw error;
    // Map data to match requested format: [{ link_id, patient_id, full_name, email, linked_at, is_active }]
    // Note: Depends on actual schema relations, might need adjustments.
    const result = data.map((d: any) => ({
      link_id: d.id,
      patient_id: d.patient_id,
      full_name: d.profiles?.full_name,
      email: d.profiles?.email,
      linked_at: d.linked_at,
      is_active: d.is_active
    }));

    return reply.status(200).send(result);
  });

  fastify.delete<{ Params: { patientId: string } }>('/linking/patients/:patientId', async (request, reply) => {
    const user = request.user as any;
    const hospitalId = user.hospitalId;
    const { patientId } = request.params;

    const { error } = await supabaseAdmin
      .from('patient_hospital_links')
      .update({ is_active: false })
      .eq('patient_id', patientId)
      .eq('hospital_id', hospitalId);

    if (error) throw error;
    return reply.status(200).send({ success: true });
  });
}
