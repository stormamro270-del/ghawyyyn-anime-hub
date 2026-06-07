DROP POLICY IF EXISTS "Anyone can insert score" ON public.leaderboard;

CREATE POLICY "Anyone can insert valid score"
ON public.leaderboard
FOR INSERT
TO public
WITH CHECK (
  length(btrim(player_name)) BETWEEN 1 AND 24
  AND score BETWEEN 0 AND 10000000
  AND game IN ('snake', 'apple-2048', 'tic-tac-toe')
);