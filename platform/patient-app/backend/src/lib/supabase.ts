import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client factory module.
 *
 * Two clients are exposed:
 *  - `supabaseAdmin`: service-role key, bypasses RLS. Use only for trusted
 *    server-side operations where you have already validated the caller.
 *  - `createUserClient(jwt)`: anon key + user JWT so that Supabase RLS
 *    policies are applied for every query.
 *
 * NEVER expose `supabaseAdmin` to the client or pass the service-role key
 * through any response payload.
 */

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: SUPABASE_URL');
}
if (!serviceRoleKey) {
  throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
}
if (!anonKey) {
  throw new Error('Missing environment variable: SUPABASE_ANON_KEY');
}

/**
 * Admin client — service-role key.
 * Use for operations that must bypass RLS (e.g., fetching a profile after
 * JWT verification, writing audit logs, managing storage).
 */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  },
);

/**
 * Create a per-request Supabase client that carries the caller's JWT so that
 * Supabase Row-Level Security policies are evaluated against the authenticated
 * user.
 *
 * @param jwt - The raw JWT string from the Authorization Bearer header.
 */
export function createUserClient(jwt: string): SupabaseClient {
  return createClient(supabaseUrl as string, anonKey as string, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
