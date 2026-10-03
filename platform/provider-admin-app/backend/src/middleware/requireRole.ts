import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Factory that returns a Fastify preHandler hook enforcing one or more allowed roles.
 *
 * Usage:
 *   fastify.addHook('preHandler', requireRole('admin'))
 *   fastify.addHook('preHandler', requireRole('admin', 'hospital_admin'))
 */
export function requireRole(...allowedRoles: string[]) {
  return async function roleGuard(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthenticated request',
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        success: false,
        error: `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
      });
    }
  };
}
