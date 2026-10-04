import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyRequest,
  FastifyReply,
} from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import type {
  AppointmentResponse,
  PaginatedResponse,
  AppointmentStatus,
} from '../../../../shared/types/index';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createAppointmentSchema = z.object({
  hospital_id: z.string().uuid('hospital_id must be a valid UUID'),
  scheduled_at: z
    .string()
    .datetime({ message: 'scheduled_at must be a valid ISO datetime' }),
  reason: z
    .string()
    .min(10, 'reason must be at least 10 characters')
    .max(1000, 'reason must not exceed 1000 characters'),
  provider_id: z
    .string()
    .uuid('provider_id must be a valid UUID')
    .optional(),
});

const listAppointmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      'scheduled',
      'confirmed',
      'cancelled',
      'completed',
      'no_show',
    ] as const)
    .optional(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'scheduled',
    'confirmed',
    'cancelled',
    'completed',
    'no_show',
  ] as const),
  notes: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function createAppointment(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const parsed = createAppointmentSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      success: false,
      error: parsed.error.errors.map((e) => e.message).join('; '),
      code: 'VALIDATION_ERROR',
    });
  }

  const { hospital_id, scheduled_at, reason, provider_id } = parsed.data;
  const patientProfileId = request.user.profile.id;

  // Verify hospital exists and is active.
  const { data: hospital, error: hospitalError } = await supabaseAdmin
    .from('hospitals')
    .select('id, is_active')
    .eq('id', hospital_id)
    .single();

  if (hospitalError || !hospital) {
    return reply.status(404).send({
      success: false,
      error: 'Hospital not found.',
      code: 'HOSPITAL_NOT_FOUND',
    });
  }

  if (!hospital.is_active) {
    return reply.status(422).send({
      success: false,
      error: 'Hospital is not currently accepting appointments.',
      code: 'HOSPITAL_INACTIVE',
    });
  }

  // If a provider is requested, check for scheduling conflicts.
  if (provider_id) {
    const { data: conflict } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('provider_id', provider_id)
      .eq('scheduled_at', scheduled_at)
      .not('status', 'in', '("cancelled","no_show")')
      .maybeSingle();

    if (conflict) {
      return reply.status(409).send({
        success: false,
        error: 'Provider already has an appointment at the requested time.',
        code: 'TIME_CONFLICT',
      });
    }
  }

  // Insert appointment.
  const { data: appointment, error: insertError } = await supabaseAdmin
    .from('appointments')
    .insert({
      patient_id: patientProfileId,
      hospital_id,
      scheduled_at,
      reason,
      provider_id: provider_id ?? null,
      status: 'scheduled',
    })
    .select(
      `
      *,
      hospital:hospitals(id, name, address),
      patient:profiles!appointments_patient_id_fkey(id, first_name, last_name),
      provider:profiles!appointments_provider_id_fkey(id, first_name, last_name)
    `,
    )
    .single();

  if (insertError || !appointment) {
    request.log.error({ insertError }, 'Failed to create appointment');
    return reply.status(500).send({
      success: false,
      error: 'Failed to create appointment.',
      code: 'INSERT_FAILED',
    });
  }

  // Notify the provider (if assigned).
  if (provider_id) {
    const providerProfile = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('id', provider_id)
      .single();

    if (providerProfile.data?.user_id) {
      await supabaseAdmin.from('notifications').insert({
        user_id: providerProfile.data.user_id,
        type: 'appointment_reminder',
        title: 'New Appointment Scheduled',
        body: `A new appointment has been scheduled for ${new Date(scheduled_at).toLocaleString()}.`,
        reference_id: appointment.id,
        is_read: false,
      });
    }
  }

  return reply.status(201).send({
    success: true,
    data: appointment as AppointmentResponse,
  });
}

async function listAppointments(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const parsed = listAppointmentsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.status(400).send({
      success: false,
      error: parsed.error.errors.map((e) => e.message).join('; '),
      code: 'VALIDATION_ERROR',
    });
  }

  const { page, per_page, status } = parsed.data;
  const { profile } = request.user;
  const offset = (page - 1) * per_page;

  let query = supabaseAdmin
    .from('appointments')
    .select(
      `
      *,
      hospital:hospitals(id, name, address),
      patient:profiles!appointments_patient_id_fkey(id, first_name, last_name),
      provider:profiles!appointments_provider_id_fkey(id, first_name, last_name)
    `,
      { count: 'exact' },
    )
    .order('scheduled_at', { ascending: false })
    .range(offset, offset + per_page - 1);

  // Scope by role.
  if (profile.role === 'patient') {
    query = query.eq('patient_id', profile.id);
  } else if (profile.role === 'provider') {
    query = query.eq('provider_id', profile.id);
  }
  // Admin sees everything — no additional filter.

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    request.log.error({ error }, 'Failed to list appointments');
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve appointments.',
      code: 'QUERY_FAILED',
    });
  }

  const total = count ?? 0;
  const items = (data ?? []) as AppointmentResponse[];
  const response: PaginatedResponse<AppointmentResponse> = {
    data: items,
    items,
    total,
    page,
    per_page,
    total_pages: Math.ceil(total / per_page),
  };

  return reply.send({ success: true, data: response });
}

async function getAppointment(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = request.params;
  const { profile } = request.user;

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .select(
      `
      *,
      hospital:hospitals(id, name, address),
      patient:profiles!appointments_patient_id_fkey(id, first_name, last_name),
      provider:profiles!appointments_provider_id_fkey(id, first_name, last_name),
      case:cases(id, status, diagnosis)
    `,
    )
    .eq('id', id)
    .single();

  if (error || !appointment) {
    return reply.status(404).send({
      success: false,
      error: 'Appointment not found.',
      code: 'NOT_FOUND',
    });
  }

  // Patients can only see their own appointments.
  if (
    profile.role === 'patient' &&
    appointment.patient_id !== profile.id
  ) {
    return reply.status(403).send({
      success: false,
      error: 'Access denied.',
      code: 'FORBIDDEN',
    });
  }

  // Providers can only see their assigned appointments.
  if (
    profile.role === 'provider' &&
    appointment.provider_id !== profile.id
  ) {
    return reply.status(403).send({
      success: false,
      error: 'Access denied.',
      code: 'FORBIDDEN',
    });
  }

  return reply.send({
    success: true,
    data: appointment as AppointmentResponse,
  });
}

async function updateAppointmentStatus(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = request.params;
  const { profile, user } = request.user;

  const parsed = updateStatusSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      success: false,
      error: parsed.error.errors.map((e) => e.message).join('; '),
      code: 'VALIDATION_ERROR',
    });
  }

  const { status, notes } = parsed.data;

  // Fetch existing appointment for ownership check and audit.
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('appointments')
    .select('*, patient:profiles!appointments_patient_id_fkey(user_id)')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return reply.status(404).send({
      success: false,
      error: 'Appointment not found.',
      code: 'NOT_FOUND',
    });
  }

  // Providers can only update their own appointments.
  if (
    profile.role === 'provider' &&
    existing.provider_id !== profile.id
  ) {
    return reply.status(403).send({
      success: false,
      error: 'You can only update your own appointments.',
      code: 'FORBIDDEN',
    });
  }

  const oldStatus: AppointmentStatus = existing.status;

  // Perform update.
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('appointments')
    .update({
      status,
      notes: notes ?? existing.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError || !updated) {
    request.log.error({ updateError }, 'Failed to update appointment status');
    return reply.status(500).send({
      success: false,
      error: 'Failed to update appointment.',
      code: 'UPDATE_FAILED',
    });
  }

  // Write audit log.
  await supabaseAdmin.from('audit_logs').insert({
    actor_id: user.id,
    action: 'appointment.status_changed',
    table_name: 'appointments',
    record_id: id,
    old_data: { status: oldStatus },
    new_data: { status },
  });

  // Notify the patient.
  if (existing.patient?.user_id) {
    await supabaseAdmin.from('notifications').insert({
      user_id: existing.patient.user_id,
      type: 'appointment_status',
      title: 'Appointment Status Updated',
      body: `Your appointment status has been updated to "${status}".`,
      reference_id: id,
      is_read: false,
    });
  }

  return reply.send({ success: true, data: updated });
}

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

export async function appointmentsPlugin(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // All appointment routes require authentication.
  fastify.addHook('preHandler', authenticate);

  fastify.post('/', { handler: createAppointment });
  fastify.post('/appointments', { handler: createAppointment });
  fastify.get('/', { handler: listAppointments });
  fastify.get('/appointments', { handler: listAppointments });
  fastify.get<{ Params: { id: string } }>('/:id', {
    handler: getAppointment,
  });
  fastify.get<{ Params: { id: string } }>('/appointments/:id', {
    handler: getAppointment,
  });
  fastify.patch<{ Params: { id: string } }>('/:id/status', {
    preHandler: [requireRole('provider', 'admin')],
    handler: updateAppointmentStatus,
  });
  fastify.patch<{ Params: { id: string } }>('/appointments/:id/status', {
    preHandler: [requireRole('provider', 'admin')],
    handler: updateAppointmentStatus,
  });
}

export const appointmentRoutes = appointmentsPlugin;
export default appointmentsPlugin;
