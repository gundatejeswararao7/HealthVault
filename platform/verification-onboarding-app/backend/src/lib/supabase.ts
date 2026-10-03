import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) throw new Error('SUPABASE_URL is required');
if (!supabaseServiceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
if (!supabaseAnonKey) throw new Error('SUPABASE_ANON_KEY is required');

/**
 * Server-side admin client — uses service role key.
 * NEVER expose this to the client.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Public client — uses anon key.
 * Safe for client-side operations where RLS applies.
 */
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
