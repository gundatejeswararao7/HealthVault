import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { appointmentRoutes } from './routes/appointments';
import { documentRoutes } from './routes/documents';
import { claimRoutes } from './routes/claims';
import { notificationRoutes } from './routes/notifications';
import { profileRoutes } from './routes/profile';

const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

async function main() {
  // CORS
  await server.register(cors, {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3001',
      'http://localhost:3000',
    ],
    credentials: true,
  });

  // Multipart upload support
  await server.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // Rate Limiting
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Health check
  server.get('/health', async () => ({ status: 'ok', service: 'patient-app-backend' }));

  // Register API Routes
  await server.register(appointmentRoutes, { prefix: '/api/v1/appointments' });
  await server.register(documentRoutes, { prefix: '/api/v1/documents' });
  await server.register(claimRoutes, { prefix: '/api/v1/claims' });
  await server.register(notificationRoutes, { prefix: '/api/v1/notifications' });
  await server.register(profileRoutes, { prefix: '/api/v1/profile' });

  const port = parseInt(process.env.PORT || '4001', 10);
  try {
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Patient App Backend running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
