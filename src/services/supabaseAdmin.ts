import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables for local processes/testing
dotenv.config();

const cleanEnv = (val?: string) => val?.replace(/^["']|["']$/g, '') || '';
const supabaseUrl = cleanEnv(process.env.SUPABASE_URL);
const supabaseServiceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[Supabase Admin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseServiceKey || 'placeholder-service-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

