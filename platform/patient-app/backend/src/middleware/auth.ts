import { FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import type { AuthenticatedUser } from '../../../../shared/types/index';

/**
 * Augment Fastify's request type so TypeScript knows about `request.user`
 * after the auth middleware has run.
 */
declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser;
  }
}

/**
 * Authentication preHandler hook.
 *
 * Steps:
 *  1. Extract the Bearer token from the `Authorization` header.
 *  2. Validate it against Supabase Auth — this verifies both signature and
 *     expiry without a round-trip to the DB for every request.
 *  3. Fetch the caller's `profiles` row using the admin client so RLS is not
 *     an obstacle (we need the role before we can apply role-based guards).
 *  4. Attach `{ user, profile }` to `request.user`.
 *
 * Returns:
 *  - 401 if the header is missing or the token is invalid.
 *  - 403 if the profile row does not exist (user registered but not set up).
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: 'Missing or malformed Authorization header.',
      code: 'UNAUTHORIZED',
    });
  }

  const jwt = authHeader.slice(7); // strip "Bearer "

  // Verify the JWT via Supabase Auth; this validates signature + expiry.
  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(jwt);

  if (userError || !userData?.user) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token.',
      code: 'TOKEN_INVALID',
    });
  }

  const supabaseUser = userData.user;

  // Fetch the profile row from the `profiles` table.
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('auth_uid', supabaseUser.id)
    .single();

  if (profileError || !profile) {
    return reply.status(403).send({
      success: false,
      error: 'User profile not found. Contact an administrator.',
      code: 'PROFILE_NOT_FOUND',
    });
  }

  // Attach to request for downstream handlers.
  request.user = {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    role: profile.role,
    profileId: profile.id,
    hospitalId: profile.branch_id,
    token: jwt,
  };
}

export const requireAuth = authenticate;
export default authenticate;
