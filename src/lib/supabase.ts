import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type PollOption = {
  id: string;
  name: string;
  location: string;
  map_url: string | null;
  created_by: string;
  created_at: string;
  vote_count: number;
};

export type Vote = {
  id: string;
  option_id: string;
  user_id: string;
  created_at: string;
};
