import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { authenticate } from './middleware/auth';
import { requireRole } from './middleware/requireRole';
import linkingRoutes from './routes/linking';
import billingRoutes from './routes/billing';
import claimsRoutes from './routes/claims';
import documentsRoutes from './routes/documents';
import patientsRoutes from './routes/patients';

async function main() {
  const fastify = Fastify({ logger: true });
  await fastify.register(cors, { origin: process.env.FRONTEND_URL || 'http://localhost:3002' });
  await fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await fastify.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  fastify.addHook('preHandler', authenticate);
  await fastify.register(linkingRoutes, { prefix: '/api/v1' });
  await fastify.register(billingRoutes, { prefix: '/api/v1' });
  await fastify.register(claimsRoutes, { prefix: '/api/v1' });
  await fastify.register(documentsRoutes, { prefix: '/api/v1' });
  await fastify.register(patientsRoutes, { prefix: '/api/v1' });

  const port = parseInt(process.env.PORT || '4002');
  await fastify.listen({ port, host: '0.0.0.0' });
}
main().catch(err => { console.error(err); process.exit(1); });
