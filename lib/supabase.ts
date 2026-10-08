import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simple database types for our app
export type User = {
  id: string;
  name: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
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

export type SnakeGame = {
  id: string;
  is_active: boolean;
  created_at: string;
};

export type SnakeScore = {
  id: string;
  user_id: string;
  snake_game_id: string;
  food_eaten: number;
  completed_at: string;
};

export type ConnectionsDifficulty = 'yellow' | 'green' | 'blue' | 'purple';

export type ConnectionsGroup = {
  label: string;
  difficulty: ConnectionsDifficulty;
  words: string[];
};

export type ConnectionsGame = {
  id: string;
  groups: ConnectionsGroup[];
  is_active: boolean;
  created_at: string;
};

export type ConnectionsScore = {
  id: string;
  user_id: string;
  connections_game_id: string;
  mistakes: number;
  solved: number[];
  guesses: string[][];
  points: number;
  won: boolean;
  is_complete: boolean;
  completed_at: string;
};
