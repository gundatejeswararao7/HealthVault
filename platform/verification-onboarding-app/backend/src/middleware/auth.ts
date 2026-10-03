import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../lib/supabase';

export interface JwtPayload {
  sub: string;       // auth user id
  role: string;      // app role: admin | insurer | patient | provider
  profileId: string;
  hospitalId?: string;
  iat: number;
  exp: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

/**
 * Verifies the Bearer JWT on every protected route.
 * Attaches decoded payload to request.user.
 * Also validates the profile still exists in the DB so revoked sessions fail fast.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET env var is not configured');

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, secret) as JwtPayload;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }

  // Confirm profile still exists and role hasn't changed
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', payload.profileId)
    .single();

  if (error || !profile) {
    return reply.status(401).send({ error: 'Profile not found — token is invalid' });
  }

  if (profile.role !== payload.role) {
    return reply.status(403).send({ error: 'Role mismatch — please re-authenticate' });
  }

  request.user = payload;
}
