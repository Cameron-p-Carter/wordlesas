import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simple database types for our app
export type User = {
  id: string;
  name: string;
  is_admin: boolean;
  created_at: string;
};

export type Game = {
  id: string;
  word: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
};

export type Score = {
  id: string;
  user_id: string;
  game_id: string;
  guesses_count: number;
  points: number;
  completed_at: string;
  guesses: string[];
  won: boolean;
};

export type ScoreWithUser = Score & {
  users: User;
};
