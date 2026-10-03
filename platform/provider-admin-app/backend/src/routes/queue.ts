import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireRole } from '../middleware/requireRole.js';

const QueueQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * Queue routes — core incoming request queue for providers.
 *
 * All routes require the caller to be a provider or hospital_admin.
 * Results are automatically scoped to the authenticated user's hospital.
 */
export async function queueRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // Enforce role for all routes in this plugin
  fastify.addHook(
    'preHandler',
    requireRole('provider', 'hospital_admin', 'admin')
  );

  /**
   * GET /queue
   * Returns paginated list of pending appointments & case statuses for the provider's hospital.
   * Joins appointments with patient names and linked case status.
   */
  fastify.get(
    '/queue',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { hospitalId } = request.user;

      if (!hospitalId) {
        return reply.status(403).send({
          success: false,
          error: 'No hospital associated with this account',
        });
      }

      const parseResult = QueueQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid query parameters',
          details: parseResult.error.flatten(),
        });
      }

      const { status, date_from, date_to, search, page, limit } = parseResult.data;
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('appointments')
        .select(
          `
          id,
          appointment_date,
          appointment_time,
          status,
          reason,
          created_at,
          patient:profiles!appointments_patient_id_fkey (
            id,
            full_name,
            email
          ),
          case:cases (
            id,
            status,
            diagnosis,
            opened_at,
            closed_at
          )
        `,
          { count: 'exact' }
        )
        .eq('hospital_id', hospitalId)
        .order('appointment_date', { ascending: true })
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      if (date_from) {
        query = query.gte('appointment_date', date_from);
      }

      if (date_to) {
        query = query.lte('appointment_date', date_to);
      }

      if (search) {
        // Search by patient name via ilike on joined column
        query = query.ilike('patient.full_name', `%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        request.log.error({ error }, 'Failed to fetch queue');
        return reply.status(500).send({ success: false, error: 'Failed to fetch queue' });
      }

      return reply.send({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / limit),
        },
      });
    }
  );

  /**
   * GET /queue/stats
   * Returns count breakdown by appointment status for the provider's hospital.
   */
  fastify.get(
    '/queue/stats',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { hospitalId } = request.user;

      if (!hospitalId) {
        return reply.status(403).send({
          success: false,
          error: 'No hospital associated with this account',
        });
      }

      const statuses = ['pending', 'confirmed', 'completed', 'cancelled'] as const;

      const counts = await Promise.all(
        statuses.map(async (s) => {
          const { count, error } = await supabaseAdmin
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('hospital_id', hospitalId)
            .eq('status', s);

          if (error) {
            request.log.error({ error, status: s }, 'Failed to fetch queue stat');
            return { status: s, count: 0 };
          }

          return { status: s, count: count ?? 0 };
        })
      );

      const stats = Object.fromEntries(counts.map(({ status, count }) => [status, count]));

      return reply.send({ success: true, data: stats });
    }
  );
}
