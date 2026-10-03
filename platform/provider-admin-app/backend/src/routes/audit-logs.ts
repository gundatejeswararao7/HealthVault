import { FastifyPluginAsync } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

export const auditLogRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireRole('admin'));

  // GET /audit-logs - list audit logs
  fastify.get('/', async (request, reply) => {
    const query = request.query as {
      page?: string;
      per_page?: string;
      table_name?: string;
      actor_id?: string;
      action?: string;
    };

    const page = parseInt(query.page || '1', 10);
    const perPage = parseInt(query.per_page || '20', 10);
    const offset = (page - 1) * perPage;

    let q = supabaseAdmin
      .from('audit_logs')
      .select('*, profiles(id, role, auth_uid)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (query.table_name) {
      q = q.eq('table_name', query.table_name);
    }
    if (query.actor_id) {
      q = q.eq('actor_id', query.actor_id);
    }
    if (query.action) {
      q = q.ilike('action', `%${query.action}%`);
    }

    const { data, count, error } = await q;
    if (error) {
      return reply.status(500).send({ success: false, error: error.message });
    }

    return {
      success: true,
      data,
      total: count || 0,
      page,
      per_page: perPage,
    };
  });
};
