
CREATE TABLE public.leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game TEXT NOT NULL,
  player_name TEXT NOT NULL CHECK (char_length(player_name) BETWEEN 1 AND 24),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10000000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX leaderboard_game_score_idx ON public.leaderboard (game, score DESC);
GRANT SELECT, INSERT ON public.leaderboard TO anon, authenticated;
GRANT ALL ON public.leaderboard TO service_role;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read leaderboard" ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "Anyone can insert score" ON public.leaderboard FOR INSERT WITH CHECK (true);
