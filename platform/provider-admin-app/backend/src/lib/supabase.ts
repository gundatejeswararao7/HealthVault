import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required');
}
if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}
if (!supabaseAnonKey) {
  throw new Error('SUPABASE_ANON_KEY environment variable is required');
}

/**
 * Service-role admin client — server-side only.
 * Bypasses RLS. Never expose this key to the client.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Creates a user-scoped Supabase client using the JWT from the incoming request.
 * Respects RLS policies — use for read operations that should be row-filtered.
 */
export function createUserClient(jwt: string): SupabaseClient {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
