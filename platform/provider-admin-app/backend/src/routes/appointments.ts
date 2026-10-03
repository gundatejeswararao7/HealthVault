import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyRequest,
  FastifyReply,
} from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireBranchScope } from '../middleware/requireBranchScope.js';

const AppointmentStatusSchema = z.object({
  status: z.enum(['confirmed', 'rejected', 'completed', 'cancelled']),
  notes: z.string().max(1000).optional(),
});

const OpenCaseSchema = z.object({
  initial_diagnosis: z.string().max(2000).optional(),
  treatment_plan: z.string().max(2000).optional(),
});

/**
 * Appointments routes — provider-side appointment management.
 * All routes are scoped to the provider's hospital via requireBranchScope.
 */
export async function appointmentRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  fastify.addHook(
    'preHandler',
    requireRole('provider', 'hospital_admin', 'admin')
  );

  /**
   * GET /appointments/:id
   * Full appointment detail — patient info, documents, linked case.
   */
  fastify.get(
    '/:id',
    {
      preHandler: requireBranchScope({ table: 'appointments' }),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const { data, error } = await supabaseAdmin
        .from('appointments')
        .select(
          `
          id,
          appointment_date,
          appointment_time,
          status,
          reason,
          notes,
          created_at,
          updated_at,
          hospital_id,
          patient:profiles!appointments_patient_id_fkey (
            id,
            full_name,
            email,
            phone,
            date_of_birth,
            gender,
            address
          ),
          case:cases (
            id,
            status,
            diagnosis,
            treatment_plan,
            opened_at,
            closed_at
          ),
          documents:appointment_documents (
            id,
            file_name,
            file_type,
            file_url,
            uploaded_at
          )
        `
        )
        .eq('id', id)
        .single();

      if (error || !data) {
        return reply.status(404).send({ success: false, error: 'Appointment not found' });
      }

      return reply.send({ success: true, data });
    }
  );

  /**
   * PATCH /appointments/:id/status
   * Approve, reject, complete, or cancel an appointment.
   * Logs action to audit_logs and inserts a notification for the patient.
   */
  fastify.patch(
    '/:id/status',
    {
      preHandler: requireBranchScope({ table: 'appointments' }),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const parseResult = AppointmentStatusSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        });
      }

      const { status, notes } = parseResult.data;

      // Fetch current appointment
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('appointments')
        .select('id, status, patient_id, hospital_id')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return reply.status(404).send({ success: false, error: 'Appointment not found' });
      }

      // Business rule: can only complete confirmed appointments
      if (status === 'completed' && existing.status !== 'confirmed') {
        return reply.status(422).send({
          success: false,
          error: 'Only confirmed appointments can be marked as completed',
        });
      }

      // Update appointment status
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('appointments')
        .update({ status, notes: notes ?? null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (updateError || !updated) {
        request.log.error({ updateError }, 'Failed to update appointment status');
        return reply.status(500).send({ success: false, error: 'Failed to update appointment' });
      }

      // Log to audit_logs
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: request.user.id,
        action: `appointment.status.${status}`,
        table_name: 'appointments',
        record_id: id,
        old_value: { status: existing.status },
        new_value: { status },
        created_at: new Date().toISOString(),
      });

      // Notify patient
      const notificationMessages: Record<string, string> = {
        confirmed: 'Your appointment has been confirmed.',
        rejected: 'Your appointment request has been rejected.',
        completed: 'Your appointment has been marked as completed.',
        cancelled: 'Your appointment has been cancelled.',
      };

      await supabaseAdmin.from('notifications').insert({
        user_id: existing.patient_id,
        title: 'Appointment Update',
        message: notificationMessages[status] ?? `Appointment status updated to ${status}.`,
        type: 'appointment',
        reference_id: id,
        is_read: false,
        created_at: new Date().toISOString(),
      });

      return reply.send({ success: true, data: updated });
    }
  );

  /**
   * POST /appointments/:id/case
   * Opens a new case linked to the appointment.
   * Validates: appointment is confirmed and no case exists yet.
   */
  fastify.post(
    '/:id/case',
    {
      preHandler: requireBranchScope({ table: 'appointments' }),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const parseResult = OpenCaseSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        });
      }

      const { initial_diagnosis, treatment_plan } = parseResult.data;

      // Fetch appointment
      const { data: appointment, error: apptError } = await supabaseAdmin
        .from('appointments')
        .select('id, status, patient_id, hospital_id')
        .eq('id', id)
        .single();

      if (apptError || !appointment) {
        return reply.status(404).send({ success: false, error: 'Appointment not found' });
      }

      if (appointment.status !== 'confirmed') {
        return reply.status(422).send({
          success: false,
          error: 'A case can only be opened for a confirmed appointment',
        });
      }

      // Ensure no case exists yet for this appointment
      const { data: existingCase } = await supabaseAdmin
        .from('cases')
        .select('id')
        .eq('appointment_id', id)
        .maybeSingle();

      if (existingCase) {
        return reply.status(409).send({
          success: false,
          error: 'A case already exists for this appointment',
        });
      }

      const now = new Date().toISOString();

      const { data: newCase, error: caseError } = await supabaseAdmin
        .from('cases')
        .insert({
          appointment_id: id,
          patient_id: appointment.patient_id,
          hospital_id: appointment.hospital_id,
          provider_id: request.user.id,
          status: 'open',
          diagnosis: initial_diagnosis ?? null,
          treatment_plan: treatment_plan ?? null,
          opened_at: now,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (caseError || !newCase) {
        request.log.error({ caseError }, 'Failed to create case');
        return reply.status(500).send({ success: false, error: 'Failed to open case' });
      }

      // Log to audit_logs
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: request.user.id,
        action: 'case.opened',
        table_name: 'cases',
        record_id: (newCase as { id: string }).id,
        old_value: null,
        new_value: { appointment_id: id, status: 'open' },
        created_at: now,
      });

      return reply.status(201).send({ success: true, data: newCase });
    }
  );
}
