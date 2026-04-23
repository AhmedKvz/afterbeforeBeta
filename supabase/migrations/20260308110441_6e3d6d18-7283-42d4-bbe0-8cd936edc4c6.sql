CREATE TABLE IF NOT EXISTS public.swipe_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  action TEXT NOT NULL,
  context TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.swipe_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own swipe actions" ON public.swipe_actions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own swipe actions" ON public.swipe_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_swipe_actions_user ON public.swipe_actions(user_id);

CREATE TABLE IF NOT EXISTS public.club_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  venue_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, venue_name)
);

ALTER TABLE public.club_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own favorites" ON public.club_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own favorites" ON public.club_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON public.club_favorites FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS geofence_radius INTEGER DEFAULT 100;