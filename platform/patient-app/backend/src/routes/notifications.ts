import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { AuthenticatedUser } from '../../../../shared/types/index';

export default async function notificationsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/notifications', async (request, reply) => {
    const user = request.user as AuthenticatedUser;
    
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.profileId)
      .order('created_at', { ascending: false });

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch notifications' });
    }

    return { data };
  });

  fastify.patch<{ Params: { id: string } }>('/notifications/:id/read', async (request, reply) => {
    const user = request.user as AuthenticatedUser;
    const { id } = request.params;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('recipient_id', user.profileId)
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to update notification' });
    }

    return { data, message: 'Notification marked as read' };
  });

  fastify.patch('/notifications/read-all', async (request, reply) => {
    const user = request.user as AuthenticatedUser;

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', user.profileId)
      .eq('read', false);

    if (error) {
      return reply.status(500).send({ error: 'Failed to mark all as read' });
    }

    return { message: 'All notifications marked as read' };
  });
}
