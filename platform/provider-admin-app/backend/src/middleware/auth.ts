import { FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';

/**
 * Shape attached to every authenticated request.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  hospitalId: string | null;
  profileId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser;
  }
}

/**
 * Authentication middleware — validates the Bearer JWT with Supabase,
 * fetches the user profile from `profiles`, and (if provider) resolves
 * `hospitalId` from `hospital_users`.
 *
 * Attaches `request.user` for all downstream handlers.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: 'Missing or malformed Authorization header',
    });
  }

  const jwt = authHeader.slice(7);

  // Verify JWT and get Supabase user
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(jwt);

  if (authError || !user) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token',
    });
  }

  // Fetch application profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, email')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return reply.status(403).send({
      success: false,
      error: 'User profile not found',
    });
  }

  let hospitalId: string | null = null;

  // For providers, resolve their associated hospital
  if (profile.role === 'provider') {
    const { data: hospitalUser } = await supabaseAdmin
      .from('hospital_users')
      .select('hospital_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (hospitalUser) {
      hospitalId = hospitalUser.hospital_id as string;
    }
  }

  // For admin roles, optionally resolve hospital scope too
  if (profile.role === 'admin' || profile.role === 'hospital_admin') {
    const { data: hospitalUser } = await supabaseAdmin
      .from('hospital_users')
      .select('hospital_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (hospitalUser) {
      hospitalId = hospitalUser.hospital_id as string;
    }
  }

  request.user = {
    id: user.id,
    email: profile.email as string,
    role: profile.role as string,
    hospitalId,
    profileId: profile.id as string,
  };
}
