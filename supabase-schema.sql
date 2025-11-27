-- Wordle Clone Database Schema
-- Run this in your Supabase SQL Editor

-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table (each daily wordle)
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scores table (user attempts for each game)
CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  guesses_count INTEGER CHECK (guesses_count >= 1 AND guesses_count <= 6),
  points INTEGER CHECK (points >= 0 AND points <= 5),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  guesses JSONB, -- Store all guesses as array
  won BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, game_id) -- Each user can only play each game once
);

-- Create indexes for better query performance
CREATE INDEX idx_scores_user_id ON scores(user_id);
CREATE INDEX idx_scores_game_id ON scores(game_id);
CREATE INDEX idx_games_active ON games(is_active);
CREATE INDEX idx_users_name ON users(name);

-- Insert a default admin user (you can change this)
INSERT INTO users (name, is_admin) VALUES ('admin', TRUE);

-- Function to calculate points based on guesses
CREATE OR REPLACE FUNCTION calculate_points(guesses_count INTEGER, won BOOLEAN)
RETURNS INTEGER AS $$
BEGIN
  IF NOT won THEN
    RETURN 0;
  END IF;

  CASE guesses_count
    WHEN 1 THEN RETURN 5;
    WHEN 2 THEN RETURN 4;
    WHEN 3 THEN RETURN 3;
    WHEN 4 THEN RETURN 2;
    WHEN 5 THEN RETURN 1;
    WHEN 6 THEN RETURN 1;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can read all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert themselves" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update users" ON users FOR UPDATE USING (is_admin = true);
CREATE POLICY "Admins can delete users" ON users FOR DELETE USING (is_admin = true);

-- Policies for games table
CREATE POLICY "Anyone can read games" ON games FOR SELECT USING (true);
CREATE POLICY "Admins can insert games" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update games" ON games FOR UPDATE USING (true);
CREATE POLICY "Admins can delete games" ON games FOR DELETE USING (true);

-- Policies for scores table
CREATE POLICY "Anyone can read scores" ON scores FOR SELECT USING (true);
CREATE POLICY "Users can insert their own scores" ON scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own scores" ON scores FOR UPDATE USING (true);
CREATE POLICY "Admins can delete scores" ON scores FOR DELETE USING (true);
