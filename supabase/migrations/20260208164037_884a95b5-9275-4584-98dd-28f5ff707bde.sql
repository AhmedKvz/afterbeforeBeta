-- Lucky 100 Claims (Winners claim prizes)
CREATE TABLE IF NOT EXISTS public.lucky_100_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_id UUID REFERENCES public.lucky_100_entries(id) ON DELETE CASCADE NOT NULL,
  event_choice TEXT NOT NULL,
  guestlist_name TEXT NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'redeemed'))
);

-- Event Reviews
CREATE TABLE IF NOT EXISTS public.event_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  review_text TEXT,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- Weekly Leaderboard (Computed)
CREATE TABLE IF NOT EXISTS public.weekly_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_xp INTEGER DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_number, year)
);

-- Enable RLS
ALTER TABLE public.lucky_100_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_leaderboard ENABLE ROW LEVEL SECURITY;

-- Lucky 100 Claims Policies
CREATE POLICY "Users view own claims" ON public.lucky_100_claims 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own claims" ON public.lucky_100_claims 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all claims" ON public.lucky_100_claims 
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update claims" ON public.lucky_100_claims 
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Event Reviews Policies
CREATE POLICY "Users view all reviews" ON public.event_reviews 
  FOR SELECT USING (true);

CREATE POLICY "Users insert own reviews" ON public.event_reviews 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reviews" ON public.event_reviews 
  FOR UPDATE USING (auth.uid() = user_id);

-- Weekly Leaderboard Policies
CREATE POLICY "Users view all leaderboard" ON public.weekly_leaderboard 
  FOR SELECT USING (true);

CREATE POLICY "System insert leaderboard" ON public.weekly_leaderboard 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System update leaderboard" ON public.weekly_leaderboard 
  FOR UPDATE USING (auth.uid() = user_id);

-- Update weekly leaderboard function
CREATE OR REPLACE FUNCTION public.update_weekly_leaderboard()
RETURNS TRIGGER AS $$
DECLARE
  current_week INTEGER;
  current_year INTEGER;
  user_total_xp INTEGER;
BEGIN
  current_week := EXTRACT(WEEK FROM NOW());
  current_year := EXTRACT(YEAR FROM NOW());
  
  -- Calculate user's total XP for this week
  SELECT COALESCE(SUM(amount), 0) INTO user_total_xp
  FROM public.xp_transactions
  WHERE user_id = NEW.user_id 
    AND EXTRACT(WEEK FROM created_at) = current_week
    AND EXTRACT(YEAR FROM created_at) = current_year;
  
  -- Upsert leaderboard entry
  INSERT INTO public.weekly_leaderboard (user_id, week_number, year, total_xp)
  VALUES (NEW.user_id, current_week, current_year, user_total_xp)
  ON CONFLICT (user_id, week_number, year) 
  DO UPDATE SET total_xp = user_total_xp, updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for leaderboard updates
DROP TRIGGER IF EXISTS update_leaderboard_on_xp ON public.xp_transactions;
CREATE TRIGGER update_leaderboard_on_xp
  AFTER INSERT ON public.xp_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_weekly_leaderboard();

-- Award XP for reviews function
CREATE OR REPLACE FUNCTION public.award_review_xp()
RETURNS TRIGGER AS $$
DECLARE
  xp_amount INTEGER;
BEGIN
  -- 200 XP for text review, 100 XP for stars only
  IF NEW.review_text IS NOT NULL AND LENGTH(NEW.review_text) > 10 THEN
    xp_amount := 200;
  ELSE
    xp_amount := 100;
  END IF;
  
  -- Insert XP transaction
  INSERT INTO public.xp_transactions (user_id, amount, reason)
  VALUES (NEW.user_id, xp_amount, 'Event review');
  
  -- Update review with XP earned
  NEW.xp_earned := xp_amount;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for review XP
DROP TRIGGER IF EXISTS award_xp_on_review ON public.event_reviews;
CREATE TRIGGER award_xp_on_review
  BEFORE INSERT ON public.event_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.award_review_xp();

-- Function to get event stats (rating, review count)
CREATE OR REPLACE FUNCTION public.get_event_stats(event_uuid UUID)
RETURNS TABLE(avg_rating NUMERIC, review_count BIGINT, latest_review TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(AVG(rating)::NUMERIC, 0) as avg_rating,
    COUNT(*)::BIGINT as review_count,
    MAX(created_at) as latest_review
  FROM public.event_reviews
  WHERE event_id = event_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get weekly leaderboard with ranks
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(week_num INTEGER, year_num INTEGER, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  total_xp INTEGER,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wl.user_id,
    p.display_name,
    p.avatar_url,
    wl.total_xp,
    ROW_NUMBER() OVER (ORDER BY wl.total_xp DESC)::BIGINT as rank
  FROM public.weekly_leaderboard wl
  JOIN public.profiles p ON p.user_id = wl.user_id
  WHERE wl.week_number = week_num AND wl.year = year_num
  ORDER BY wl.total_xp DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;