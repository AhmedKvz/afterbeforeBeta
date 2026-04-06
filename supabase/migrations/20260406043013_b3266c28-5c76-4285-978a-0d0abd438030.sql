
-- Club weekly votes: vote for best party and best DJ each week
CREATE TABLE public.club_weekly_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT NOT NULL, -- 'best_party' or 'best_dj'
  vote_value TEXT NOT NULL, -- event title or DJ name (from events)
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL DEFAULT EXTRACT(WEEK FROM NOW())::INTEGER,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, vote_type, week_number, year)
);

ALTER TABLE public.club_weekly_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view votes" ON public.club_weekly_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own vote" ON public.club_weekly_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vote" ON public.club_weekly_votes
  FOR UPDATE USING (auth.uid() = user_id);
