
-- Drop existing Lucky 100 triggers and function with CASCADE
DROP TRIGGER IF EXISTS lucky_100_on_checkin ON public.event_checkins;
DROP TRIGGER IF EXISTS lucky_100_on_wishlist ON public.event_wishlists;
DROP FUNCTION IF EXISTS auto_enter_lucky_100() CASCADE;

-- Create Lucky 100 counter table (singleton)
CREATE TABLE IF NOT EXISTS public.lucky100_counter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_count INTEGER DEFAULT 0,
  last_winner_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Lucky 100 winners table for instant wins
CREATE TABLE IF NOT EXISTS public.lucky100_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  check_in_number INTEGER NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  won_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  prize_claimed BOOLEAN DEFAULT false,
  prize_event_choice TEXT,
  guestlist_name TEXT,
  claimed_at TIMESTAMP WITH TIME ZONE
);

-- Create weekly winners archive table
CREATE TABLE IF NOT EXISTS public.weekly_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  rank INTEGER NOT NULL,
  total_xp INTEGER NOT NULL,
  prize_claimed BOOLEAN DEFAULT false,
  prize_event_choice TEXT,
  guestlist_name TEXT,
  won_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  claimed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.lucky100_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lucky100_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_winners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lucky100_counter
CREATE POLICY "Anyone can view counter"
  ON public.lucky100_counter FOR SELECT
  USING (true);

-- RLS Policies for lucky100_winners
CREATE POLICY "Anyone can view lucky winners"
  ON public.lucky100_winners FOR SELECT
  USING (true);

CREATE POLICY "Users can claim own prizes"
  ON public.lucky100_winners FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for weekly_winners
CREATE POLICY "Anyone can view weekly winners"
  ON public.weekly_winners FOR SELECT
  USING (true);

CREATE POLICY "Users can claim own weekly prizes"
  ON public.weekly_winners FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage weekly winners"
  ON public.weekly_winners FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to check for Lucky 100 winner on check-in
CREATE OR REPLACE FUNCTION public.check_lucky100_winner()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  lucky_interval INTEGER := 5;
BEGIN
  -- Increment global counter and get new count
  UPDATE public.lucky100_counter
  SET global_count = global_count + 1,
      updated_at = NOW()
  RETURNING global_count INTO current_count;
  
  -- Check if this is a lucky number (every 5th check-in)
  IF current_count % lucky_interval = 0 THEN
    -- Record winner
    INSERT INTO public.lucky100_winners (user_id, check_in_number, event_id)
    VALUES (NEW.user_id, current_count, NEW.event_id);
    
    -- Update last winner count
    UPDATE public.lucky100_counter
    SET last_winner_count = current_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for Lucky 100 on check-in
CREATE TRIGGER lucky100_on_checkin
  AFTER INSERT ON public.event_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.check_lucky100_winner();

-- Function to get Lucky 100 stats
CREATE OR REPLACE FUNCTION public.get_lucky100_stats()
RETURNS TABLE(
  global_count INTEGER,
  last_winner_count INTEGER,
  next_lucky_number INTEGER,
  check_ins_to_next INTEGER
) AS $$
DECLARE
  current_count INTEGER;
  last_winner INTEGER;
  lucky_interval INTEGER := 5;
BEGIN
  SELECT c.global_count, c.last_winner_count
  INTO current_count, last_winner
  FROM public.lucky100_counter c
  LIMIT 1;
  
  RETURN QUERY SELECT
    current_count,
    last_winner,
    ((current_count / lucky_interval) + 1) * lucky_interval,
    lucky_interval - (current_count % lucky_interval);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function for admin to announce weekly winners
CREATE OR REPLACE FUNCTION public.announce_weekly_winners()
RETURNS TABLE(
  winner_id UUID,
  winner_name TEXT,
  winner_rank INTEGER,
  winner_xp INTEGER
) AS $$
DECLARE
  current_week_start DATE;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can announce winners';
  END IF;
  
  -- Get Monday of current week
  current_week_start := DATE_TRUNC('week', NOW())::DATE;
  
  -- Insert top 3 into weekly_winners and return them
  RETURN QUERY
  WITH top_3 AS (
    SELECT 
      wl.user_id,
      p.display_name,
      wl.total_xp,
      ROW_NUMBER() OVER (ORDER BY wl.total_xp DESC)::INTEGER as rank
    FROM public.weekly_leaderboard wl
    JOIN public.profiles p ON p.user_id = wl.user_id
    WHERE wl.week_number = EXTRACT(WEEK FROM NOW())::INTEGER
      AND wl.year = EXTRACT(YEAR FROM NOW())::INTEGER
    ORDER BY wl.total_xp DESC
    LIMIT 3
  ),
  inserted AS (
    INSERT INTO public.weekly_winners (user_id, week_start, rank, total_xp)
    SELECT t.user_id, current_week_start, t.rank, t.total_xp
    FROM top_3 t
    ON CONFLICT DO NOTHING
    RETURNING user_id, rank, total_xp
  )
  SELECT i.user_id, t.display_name, i.rank, i.total_xp
  FROM inserted i
  JOIN top_3 t ON t.user_id = i.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
