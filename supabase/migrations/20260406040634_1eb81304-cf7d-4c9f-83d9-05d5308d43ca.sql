
CREATE TABLE IF NOT EXISTS public.championship_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  destination TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, year)
);

ALTER TABLE public.championship_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all votes" ON public.championship_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own vote" ON public.championship_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vote" ON public.championship_votes
  FOR UPDATE USING (auth.uid() = user_id);
