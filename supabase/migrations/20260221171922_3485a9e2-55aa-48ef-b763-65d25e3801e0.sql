
-- =============================================
-- 1A. Event Signals table
-- =============================================
CREATE TABLE IF NOT EXISTS public.event_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  signal_type TEXT DEFAULT 'going' CHECK (signal_type IN ('going', 'interested', 'maybe')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view signals" ON public.event_signals
  FOR SELECT USING (true);

CREATE POLICY "Users can signal own intent" ON public.event_signals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own signal" ON public.event_signals
  FOR DELETE USING (auth.uid() = user_id);

-- Award 25 XP when user signals "going"
CREATE OR REPLACE FUNCTION public.award_signal_xp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.signal_type = 'going' THEN
    INSERT INTO public.xp_transactions (user_id, amount, reason)
    VALUES (NEW.user_id, 25, 'Signaled going to event');

    UPDATE public.profiles
    SET xp = xp + 25
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER signal_xp_trigger
  AFTER INSERT ON public.event_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.award_signal_xp();

-- =============================================
-- 1B. Seed Belgrade clubs and events
-- =============================================
DELETE FROM public.events;

-- DRUGSTORE
INSERT INTO public.events (
  title, description, date, start_time, end_time,
  venue_name, address, latitude, longitude,
  image_url, music_genres, capacity, price
) VALUES
(
  'MAGLA 2 Year Anniversary',
  'Two years of MAGLA! Celebrating with an epic lineup across the Drugstore warehouse. Featuring Amotik (Berlin), Fergus Sweetland, Sev Dah, Stojche and more. Industrial techno at its finest. Two stages, raw concrete, no compromises.',
  '2026-02-21', '23:00', '10:00',
  'Drugstore', 'Bulevar despota Stefana 115, Belgrade',
  44.8063, 20.4766,
  'https://images.unsplash.com/photo-1571266028243-d220e7a25e74?w=800',
  ARRAY['Techno', 'Hard Techno', 'Industrial'], 400, 1500
),
(
  'Drugstore Friday Session',
  'Weekly Friday ritual. Residents take over both floors. Raw, unfiltered, underground. Drugstore as it was meant to be.',
  '2026-02-27', '23:30', '08:00',
  'Drugstore', 'Bulevar despota Stefana 115, Belgrade',
  44.8063, 20.4766,
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
  ARRAY['Techno', 'Minimal', 'Experimental'], 400, 1000
);

-- KARMAKOMA
INSERT INTO public.events (
  title, description, date, start_time, end_time,
  venue_name, address, latitude, longitude,
  image_url, music_genres, capacity, price
) VALUES
(
  'Idem Tour Life',
  'Saturday night at Karmakoma. L-Acoustics system cranked to perfection. One of Belgrade''s best mid-size clubs delivers another quality night of electronic music.',
  '2026-02-21', '23:00', '06:00',
  'Karmakoma', 'Poenkareova 32, Belgrade',
  44.7937, 20.5198,
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
  ARRAY['Techno', 'Electro'], 300, 800
),
(
  'Karmakoma Club Night',
  'Resident night. Deep selections, quality crowd, intimate atmosphere. The sound system does the rest. Doors open 23h, no presale — door only.',
  '2026-02-28', '23:00', '06:00',
  'Karmakoma', 'Poenkareova 32, Belgrade',
  44.7937, 20.5198,
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
  ARRAY['Techno', 'Trance', 'Progressive'], 300, 1000
);

-- PARA KLUB
INSERT INTO public.events (
  title, description, date, start_time, end_time,
  venue_name, address, latitude, longitude,
  image_url, music_genres, capacity, price
) VALUES
(
  'MAGLA @ Para — Sunday Day Rave',
  'MAGLA continues at Para! 16 hours of music across two stages. Para is not an afterparty club — it''s a daytime rave. Doors open 06:00, music until 22:00. Come fresh or come from the night before — just come.',
  '2026-02-22', '06:00', '22:00',
  'Para Klub', 'Bulevar vojvode Bojovića 2, Belgrade',
  44.8066, 20.4770,
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
  ARRAY['Techno', 'Minimal', 'Deep Techno'], 250, 1200
),
(
  'para.normal — 16 Hour Session',
  'Para Klub''s in-house series. 16 hours, two stages, freshest local DJs. The definition of Belgrade''s daytime rave culture. Sunday ritual.',
  '2026-03-01', '06:00', '22:00',
  'Para Klub', 'Bulevar vojvode Bojovića 2, Belgrade',
  44.8066, 20.4770,
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
  ARRAY['Techno', 'Minimal', 'Trance'], 250, 1000
);

-- Initialize Lucky 100 counter if empty
INSERT INTO public.lucky100_counter (global_count, last_winner_count)
SELECT 0, 0
WHERE NOT EXISTS (SELECT 1 FROM public.lucky100_counter);

-- =============================================
-- 1C. Get Venue Heat function
-- =============================================
CREATE OR REPLACE FUNCTION public.get_venue_heat(days_back INTEGER DEFAULT 7)
RETURNS TABLE(
  venue_name TEXT,
  signal_count BIGINT,
  checkin_count BIGINT,
  total_heat BIGINT,
  top_event_title TEXT,
  top_event_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH venue_signals AS (
    SELECT
      e.venue_name AS vn,
      COUNT(DISTINCT es.id) as sig_count
    FROM public.events e
    LEFT JOIN public.event_signals es ON es.event_id = e.id
      AND es.created_at >= NOW() - (days_back || ' days')::INTERVAL
    WHERE e.date >= CURRENT_DATE - days_back
      AND e.date <= CURRENT_DATE + 7
    GROUP BY e.venue_name
  ),
  venue_checkins AS (
    SELECT
      e.venue_name AS vn,
      COUNT(DISTINCT ec.id) as chk_count
    FROM public.events e
    LEFT JOIN public.event_checkins ec ON ec.event_id = e.id
      AND ec.checked_in_at >= NOW() - (days_back || ' days')::INTERVAL
    WHERE e.date >= CURRENT_DATE - days_back
      AND e.date <= CURRENT_DATE + 7
    GROUP BY e.venue_name
  ),
  top_events AS (
    SELECT DISTINCT ON (e.venue_name)
      e.venue_name AS vn,
      e.title as top_title,
      e.id as top_id,
      COUNT(es.id) as cnt
    FROM public.events e
    LEFT JOIN public.event_signals es ON es.event_id = e.id
    WHERE e.date >= CURRENT_DATE - days_back
      AND e.date <= CURRENT_DATE + 7
    GROUP BY e.venue_name, e.title, e.id
    ORDER BY e.venue_name, cnt DESC
  )
  SELECT
    vs.vn,
    vs.sig_count,
    COALESCE(vc.chk_count, 0::BIGINT),
    vs.sig_count + COALESCE(vc.chk_count, 0::BIGINT) as total_heat,
    te.top_title,
    te.top_id
  FROM venue_signals vs
  LEFT JOIN venue_checkins vc ON vc.vn = vs.vn
  LEFT JOIN top_events te ON te.vn = vs.vn
  ORDER BY total_heat DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
