import { FastifyPluginAsync } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

export const patientRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireRole('provider', 'admin'));

  // GET /patients/:id - patient medical record
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { hospitalId, role } = request.user;

    // Defense-in-depth: Verify patient has an appointment or case with provider's hospital
    if (role === 'provider' && hospitalId) {
      const { data: appointmentMatch } = await supabaseAdmin
        .from('appointments')
        .select('id')
        .eq('patient_id', id)
        .eq('hospital_id', hospitalId)
        .limit(1);

      if (!appointmentMatch || appointmentMatch.length === 0) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied: patient has no appointment history at your hospital',
        });
      }
    }

    // Fetch patient info
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (patientError || !patient) {
      return reply.status(404).send({ success: false, error: 'Patient not found' });
    }

    // Fetch appointments at this hospital
    let appointmentsQuery = supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('patient_id', id)
      .order('scheduled_at', { ascending: false });

    if (role === 'provider' && hospitalId) {
      appointmentsQuery = appointmentsQuery.eq('hospital_id', hospitalId);
    }
    const { data: appointments } = await appointmentsQuery;

    // Fetch cases at this hospital
    let casesQuery = supabaseAdmin
      .from('cases')
      .select('*, treatment_items(*)')
      .eq('patient_id', id)
      .order('opened_at', { ascending: false });

    if (role === 'provider' && hospitalId) {
      casesQuery = casesQuery.eq('hospital_id', hospitalId);
    }
    const { data: cases } = await casesQuery;

    return {
      success: true,
      data: {
        patient,
        appointments: appointments || [],
        cases: cases || [],
      },
    };
  });

  // GET /patients/:patientId/appointments - appointment history at this hospital
  fastify.get('/:patientId/appointments', async (request, reply) => {
    const { patientId } = request.params as { patientId: string };
    const { hospitalId, role } = request.user;

    let q = supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .order('scheduled_at', { ascending: false });

    if (role === 'provider' && hospitalId) {
      q = q.eq('hospital_id', hospitalId);
    }

    const { data, error } = await q;
    if (error) {
      return reply.status(500).send({ success: false, error: error.message });
    }

    return { success: true, data };
  });
};
