-- Snake game sessions
CREATE TABLE snake_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Snake scores (one per user per session)
CREATE TABLE snake_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  snake_game_id UUID REFERENCES snake_games(id) ON DELETE CASCADE,
  food_eaten INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, snake_game_id)
);

CREATE INDEX idx_snake_scores_user_id ON snake_scores(user_id);
CREATE INDEX idx_snake_scores_game_id ON snake_scores(snake_game_id);
CREATE INDEX idx_snake_games_active ON snake_games(is_active);

ALTER TABLE snake_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read snake games" ON snake_games FOR SELECT USING (true);
CREATE POLICY "Admins can insert snake games" ON snake_games FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update snake games" ON snake_games FOR UPDATE USING (true);
CREATE POLICY "Admins can delete snake games" ON snake_games FOR DELETE USING (true);

ALTER TABLE snake_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read snake scores" ON snake_scores FOR SELECT USING (true);
CREATE POLICY "Users can insert snake scores" ON snake_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can delete snake scores" ON snake_scores FOR DELETE USING (true);
