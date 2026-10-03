import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Role-guard factory. Returns a Fastify preHandler that rejects requests
 * whose JWT role is not in the allowed list.
 *
 * Usage:
 *   fastify.addHook('preHandler', requireRole(['admin', 'insurer']))
 *
 * Must be used AFTER the `authenticate` preHandler.
 */
export function requireRole(roles: string[]) {
  return async function roleGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }
    if (!roles.includes(request.user.role)) {
      return reply
        .status(403)
        .send({ error: `Access denied. Required role: ${roles.join(' or ')}` });
    }
  };
}
