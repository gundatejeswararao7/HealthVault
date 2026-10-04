import { FastifyRequest, FastifyReply } from 'fastify';
import type { UserRole } from '../../../../shared/types/index';

/**
 * Role-based access control factory.
 *
 * Returns a Fastify preHandler that verifies the authenticated caller's role
 * is contained in the provided set of allowed roles.
 *
 * Must be used AFTER the `authenticate` preHandler so that `request.user` is
 * already populated.
 *
 * @param roles - One or more roles that are permitted to proceed.
 *
 * @example
 * // Allow only providers and admins:
 * fastify.patch('/appointments/:id/status', {
 *   preHandler: [authenticate, requireRole('provider', 'admin')],
 *   handler,
 * });
 */
export function requireRole(
  ...roles: UserRole[]
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async function roleGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // `request.user` is guaranteed by the `authenticate` preHandler.
    const callerRole = request.user?.role;

    if (!callerRole || !roles.includes(callerRole)) {
      return reply.status(403).send({
        success: false,
        error: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${callerRole ?? 'unknown'}.`,
        code: 'FORBIDDEN',
      });
    }
  };
}
