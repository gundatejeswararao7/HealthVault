import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import branchApplicationRoutes from './routes/branch-applications';
import claimRoutes from './routes/claims';
import familyRequestRoutes from './routes/family-requests';
import hospitalRoutes from './routes/hospitals';
import { dashboardRoutes } from './routes/dashboard';

const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

async function main() {
  await server.register(cors, {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3003',
      'http://localhost:3000',
    ],
    credentials: true,
  });

  await server.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  server.get('/health', async () => ({ status: 'ok', service: 'verification-onboarding-backend' }));

  // Register routes
  await server.register(branchApplicationRoutes, { prefix: '/api/v1' });
  await server.register(claimRoutes, { prefix: '/api/v1' });
  await server.register(familyRequestRoutes, { prefix: '/api/v1' });
  await server.register(hospitalRoutes, { prefix: '/api/v1' });
  await server.register(dashboardRoutes, { prefix: '/api/v1/dashboard' });

  const port = parseInt(process.env.PORT || '4003', 10);
  try {
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Verification & Onboarding Backend running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
