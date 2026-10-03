import fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { queueRoutes } from './routes/queue.js';
import { appointmentRoutes } from './routes/appointments.js';
import { caseRoutes } from './routes/cases.js';
import { patientRoutes } from './routes/patients.js';
import { familyRequestRoutes } from './routes/family-requests.js';
import { auditLogRoutes } from './routes/audit-logs.js';

dotenv.config();

const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

async function main() {
  await server.register(cors, {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3002',
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

  server.get('/health', async () => ({ status: 'ok', service: 'provider-admin-backend' }));

  // Register routes
  await server.register(queueRoutes, { prefix: '/api/v1/queue' });
  await server.register(appointmentRoutes, { prefix: '/api/v1/appointments' });
  await server.register(caseRoutes, { prefix: '/api/v1/cases' });
  await server.register(patientRoutes, { prefix: '/api/v1/patients' });
  await server.register(familyRequestRoutes, { prefix: '/api/v1/family-requests' });
  await server.register(auditLogRoutes, { prefix: '/api/v1/audit-logs' });

  const port = parseInt(process.env.PORT || '4002', 10);
  try {
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Provider/Admin Backend running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
