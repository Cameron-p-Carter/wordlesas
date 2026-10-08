-- Connections game migration
-- Run this in your Supabase SQL Editor.
-- Mirrors the post-security-hardening model: RLS enabled, SELECT open, NO write policies
-- (server-side routes use the service role key, which bypasses RLS).

-- Puzzles authored by admins.
-- groups is a JSONB array of 4 objects:
-- { "label": string, "difficulty": "yellow"|"green"|"blue"|"purple", "words": [w1,w2,w3,w4] }
CREATE TABLE connections_games (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
groups JSONB NOT NULL,
is_active BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- One attempt per user per puzzle.
CREATE TABLE connections_scores (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
-- Better Auth user IDs are TEXT; reference the "user" table (the old plural
-- `users` table was dropped by the better-auth migration).
user_id TEXT REFERENCES "user"("id") ON DELETE CASCADE,
connections_game_id UUID REFERENCES connections_games(id) ON DELETE CASCADE,
mistakes INTEGER NOT NULL DEFAULT 0,
solved JSONB NOT NULL DEFAULT '[]', -- solved group indexes, in solve order
guesses JSONB NOT NULL DEFAULT '[]', -- history of submitted 4-word arrays
points INTEGER NOT NULL DEFAULT 0,
won BOOLEAN NOT NULL DEFAULT FALSE,
is_complete BOOLEAN NOT NULL DEFAULT FALSE,
completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
UNIQUE(user_id, connections_game_id)
);

CREATE INDEX idx_connections_scores_user_id ON connections_scores(user_id);
CREATE INDEX idx_connections_scores_game_id ON connections_scores(connections_game_id);
CREATE INDEX idx_connections_games_active ON connections_games(is_active);

ALTER TABLE connections_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections_scores ENABLE ROW LEVEL SECURITY;

-- READ-only public policies. Writes go through service-role server routes only.
CREATE POLICY "Anyone can read connections games" ON connections_games FOR SELECT USING (true);
CREATE POLICY "Anyone can read connections scores" ON connections_scores FOR SELECT USING (true);