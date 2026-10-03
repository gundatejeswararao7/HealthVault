import { FastifyPluginAsync } from 'fastify';
import { createUserClient } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireAuth);

  // GET /notifications - list user's notifications
  fastify.get('/', async (request, reply) => {
    const { profile, token } = request.user!;
    const query = request.query as { unread_only?: string };

    const supabase = createUserClient(token);
    let q = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false });

    if (query.unread_only === 'true') {
      q = q.eq('read', false);
    }

    const { data, error } = await q;
    if (error) {
      return reply.status(500).send({ error: error.message });
    }
    return { data };
  });

  // PATCH /notifications/:id/read - mark single as read
  fastify.patch('/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { profile, token } = request.user!;

    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('recipient_id', profile.id)
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }
    return { data };
  });

  // PATCH /notifications/read-all - mark all notifications read
  fastify.patch('/read-all', async (request, reply) => {
    const { profile, token } = request.user!;

    const supabase = createUserClient(token);
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', profile.id)
      .eq('read', false);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }
    return { message: 'All notifications marked as read' };
  });
};
