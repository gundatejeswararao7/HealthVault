import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { authenticate } from './middleware/auth';

import plansRoutes from './routes/plans';
import claimsRoutes from './routes/claims';
import branchApplicationRoutes from './routes/branch-applications';
import hospitalsRoutes from './routes/hospitals';
import { dashboardRoutes } from './routes/dashboard';
import familyRequestsRoutes from './routes/family-requests';

async function main() {
  const fastify = Fastify({ logger: true });
  await fastify.register(cors, { origin: process.env.FRONTEND_URL || 'http://localhost:3003' });
  await fastify.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  fastify.addHook('preHandler', authenticate);

  // Public to all authenticated (any role can submit branch app)
  await fastify.register(branchApplicationRoutes, { prefix: '/api/v1' });

  // Admin/insurer only routes
  await fastify.register(plansRoutes, { prefix: '/api/v1' });
  await fastify.register(claimsRoutes, { prefix: '/api/v1' });
  await fastify.register(hospitalsRoutes, { prefix: '/api/v1' });
  await fastify.register(dashboardRoutes, { prefix: '/api/v1/dashboard' });
  await fastify.register(familyRequestsRoutes, { prefix: '/api/v1' });

  const port = parseInt(process.env.PORT || '4003');
  await fastify.listen({ port, host: '0.0.0.0' });
}
main().catch(err => { console.error(err); process.exit(1); });
