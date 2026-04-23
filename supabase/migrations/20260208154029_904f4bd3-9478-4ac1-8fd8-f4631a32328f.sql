-- Lucky 100 weekly raffle entries table
CREATE TABLE public.lucky_100_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  eligible BOOLEAN DEFAULT true,
  won BOOLEAN DEFAULT false,
  prize_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, week_number, year)
);

-- Enable RLS
ALTER TABLE public.lucky_100_entries ENABLE ROW LEVEL SECURITY;

-- Users can view their own entries
CREATE POLICY "Users can view own lucky 100 entries"
ON public.lucky_100_entries
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own entries
CREATE POLICY "Users can insert own lucky 100 entries"
ON public.lucky_100_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can update entries (for draw)
CREATE POLICY "Admins can update lucky 100 entries"
ON public.lucky_100_entries
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Function to auto-enter user into Lucky 100
CREATE OR REPLACE FUNCTION public.auto_enter_lucky_100()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_week INTEGER;
  current_year INTEGER;
BEGIN
  -- Get ISO week number and year
  current_week := EXTRACT(WEEK FROM NOW());
  current_year := EXTRACT(YEAR FROM NOW());
  
  -- Insert entry if doesn't exist for this week
  INSERT INTO public.lucky_100_entries (user_id, week_number, year)
  VALUES (NEW.user_id, current_week, current_year)
  ON CONFLICT (user_id, week_number, year) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger on event_checkins
CREATE TRIGGER lucky_100_on_checkin
AFTER INSERT ON public.event_checkins
FOR EACH ROW
EXECUTE FUNCTION public.auto_enter_lucky_100();

-- Trigger on event_wishlists
CREATE TRIGGER lucky_100_on_wishlist
AFTER INSERT ON public.event_wishlists
FOR EACH ROW
EXECUTE FUNCTION public.auto_enter_lucky_100();

-- Function for admin to draw winners
CREATE OR REPLACE FUNCTION public.draw_lucky_100_winners(num_winners INTEGER DEFAULT 5)
RETURNS TABLE(winner_id UUID, winner_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_week INTEGER;
  current_year INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can draw winners';
  END IF;

  current_week := EXTRACT(WEEK FROM NOW());
  current_year := EXTRACT(YEAR FROM NOW());
  
  -- Select random winners and mark them
  RETURN QUERY
  WITH winners AS (
    SELECT l.id, l.user_id
    FROM public.lucky_100_entries l
    WHERE l.week_number = current_week
      AND l.year = current_year
      AND l.eligible = true
      AND l.won = false
    ORDER BY RANDOM()
    LIMIT num_winners
  ),
  updated AS (
    UPDATE public.lucky_100_entries
    SET won = true
    WHERE id IN (SELECT w.id FROM winners w)
    RETURNING user_id
  )
  SELECT u.user_id, p.display_name
  FROM updated u
  JOIN public.profiles p ON p.user_id = u.user_id;
END;
$$;