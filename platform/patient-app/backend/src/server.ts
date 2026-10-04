import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { authenticate } from './middleware/auth';
import profileRoutes from './routes/profile';
import plansRoutes from './routes/plans';
import policiesRoutes from './routes/policies';
import linkingRoutes from './routes/linking';
import billingRoutes from './routes/billing';
import documentsRoutes from './routes/documents';
import notificationsRoutes from './routes/notifications';
import claimsRoutes from './routes/claims';

async function main() {
  const fastify = Fastify({ logger: true });
  await fastify.register(cors, { origin: process.env.FRONTEND_URL || 'http://localhost:3001' });
  await fastify.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  // Public routes (no auth)
  await fastify.register(plansRoutes, { prefix: '/api/v1' });

  // Protected routes
  fastify.addHook('preHandler', authenticate);
  await fastify.register(profileRoutes, { prefix: '/api/v1' });
  await fastify.register(policiesRoutes, { prefix: '/api/v1' });
  await fastify.register(linkingRoutes, { prefix: '/api/v1' });
  await fastify.register(billingRoutes, { prefix: '/api/v1' });
  await fastify.register(documentsRoutes, { prefix: '/api/v1' });
  await fastify.register(notificationsRoutes, { prefix: '/api/v1' });
  await fastify.register(claimsRoutes, { prefix: '/api/v1' });

  const port = parseInt(process.env.PORT || '4001');
  await fastify.listen({ port, host: '0.0.0.0' });
}
main().catch(err => { console.error(err); process.exit(1); });
