
CREATE TABLE IF NOT EXISTS public.daily_swipe_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  swipe_date DATE NOT NULL DEFAULT CURRENT_DATE,
  swipe_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, swipe_date)
);
ALTER TABLE public.daily_swipe_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own limits" ON public.daily_swipe_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert limits" ON public.daily_swipe_limits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update limits" ON public.daily_swipe_limits FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.remote_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  venue_name TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '4 hours'),
  amount_rsd INTEGER NOT NULL DEFAULT 50
);
ALTER TABLE public.remote_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own unlocks" ON public.remote_unlocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert unlocks" ON public.remote_unlocks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.premium_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.premium_interest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert interest" ON public.premium_interest FOR INSERT WITH CHECK (auth.uid() = user_id);
