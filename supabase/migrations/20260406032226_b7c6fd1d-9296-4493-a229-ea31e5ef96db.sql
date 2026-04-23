
-- AI Match Scores table
CREATE TABLE IF NOT EXISTS public.ai_match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  match_score DECIMAL(5,2) DEFAULT 0,
  music_score DECIMAL(5,2) DEFAULT 0,
  behavior_score DECIMAL(5,2) DEFAULT 0,
  proximity_score DECIMAL(5,2) DEFAULT 0,
  social_score DECIMAL(5,2) DEFAULT 0,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, target_user_id, event_id)
);
ALTER TABLE public.ai_match_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own scores" ON public.ai_match_scores FOR SELECT USING (auth.uid() = user_id);

-- AI Crowd Predictions table
CREATE TABLE IF NOT EXISTS public.ai_crowd_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  predicted_attendance INTEGER,
  predicted_peak_hour TEXT,
  predicted_vibe TEXT,
  confidence DECIMAL(3,2),
  factors JSON,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actual_attendance INTEGER,
  UNIQUE(event_id)
);
ALTER TABLE public.ai_crowd_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view predictions" ON public.ai_crowd_predictions FOR SELECT USING (true);

-- AI Scene Health table
CREATE TABLE IF NOT EXISTS public.ai_scene_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_name TEXT NOT NULL,
  date DATE NOT NULL,
  health_score INTEGER,
  trust_level TEXT,
  positive_signals INTEGER DEFAULT 0,
  negative_signals INTEGER DEFAULT 0,
  review_sentiment DECIMAL(3,2),
  crowd_density TEXT,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(venue_name, date)
);
ALTER TABLE public.ai_scene_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view scene health" ON public.ai_scene_health FOR SELECT USING (true);

-- AI Training Events table
CREATE TABLE IF NOT EXISTS public.ai_training_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID NOT NULL,
  target_id TEXT,
  features JSON NOT NULL,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.ai_training_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own training events" ON public.ai_training_events FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);
CREATE INDEX IF NOT EXISTS idx_ai_training_type ON public.ai_training_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ai_training_created ON public.ai_training_events(created_at);

-- Add moderation columns to event_reviews
ALTER TABLE public.event_reviews ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending';
ALTER TABLE public.event_reviews ADD COLUMN IF NOT EXISTS moderation_score DECIMAL(3,2);
ALTER TABLE public.event_reviews ADD COLUMN IF NOT EXISTS moderation_flags TEXT[];

-- Add prediction columns to swipes
ALTER TABLE public.swipes ADD COLUMN IF NOT EXISTS predicted_score DECIMAL(5,2);
ALTER TABLE public.swipes ADD COLUMN IF NOT EXISTS was_correct BOOLEAN;

-- compute_match_score RPC
CREATE OR REPLACE FUNCTION public.compute_match_score(
  p_user_id UUID,
  p_target_id UUID,
  p_event_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  user_prefs TEXT[];
  target_prefs TEXT[];
  music_overlap INTEGER;
  music_total INTEGER;
  music_score DECIMAL;
  user_events UUID[];
  target_events UUID[];
  shared_events INTEGER;
  behavior_score DECIMAL;
  user_likes INTEGER;
  target_likes INTEGER;
  user_total_swipes INTEGER;
  target_total_swipes INTEGER;
  social_score DECIMAL;
  proximity_score DECIMAL;
  final_score DECIMAL;
BEGIN
  SELECT music_preferences INTO user_prefs FROM public.profiles WHERE user_id = p_user_id;
  SELECT music_preferences INTO target_prefs FROM public.profiles WHERE user_id = p_target_id;

  IF user_prefs IS NOT NULL AND target_prefs IS NOT NULL AND array_length(user_prefs, 1) > 0 AND array_length(target_prefs, 1) > 0 THEN
    SELECT COUNT(*) INTO music_overlap FROM unnest(user_prefs) u WHERE u = ANY(target_prefs);
    music_total := GREATEST(array_length(user_prefs, 1), array_length(target_prefs, 1));
    music_score := CASE WHEN music_total > 0 THEN (music_overlap::DECIMAL / music_total) * 100 ELSE 50 END;
  ELSE
    music_score := 50;
  END IF;

  SELECT ARRAY_AGG(DISTINCT event_id) INTO user_events FROM public.event_checkins WHERE user_id = p_user_id;
  SELECT ARRAY_AGG(DISTINCT event_id) INTO target_events FROM public.event_checkins WHERE user_id = p_target_id;

  IF user_events IS NOT NULL AND target_events IS NOT NULL THEN
    SELECT COUNT(*) INTO shared_events FROM unnest(user_events) u WHERE u = ANY(target_events);
    behavior_score := LEAST(shared_events * 20, 100);
  ELSE
    behavior_score := 30;
  END IF;

  SELECT COUNT(*) FILTER (WHERE action = 'like') INTO user_likes FROM public.swipes WHERE swiper_id = p_user_id;
  SELECT COUNT(*) INTO user_total_swipes FROM public.swipes WHERE swiper_id = p_user_id;
  SELECT COUNT(*) FILTER (WHERE action = 'like') INTO target_likes FROM public.swipes WHERE swiper_id = p_target_id;
  SELECT COUNT(*) INTO target_total_swipes FROM public.swipes WHERE swiper_id = p_target_id;

  IF user_total_swipes > 0 AND target_total_swipes > 0 THEN
    social_score := 100 - ABS(
      (user_likes::DECIMAL / GREATEST(user_total_swipes, 1)) -
      (target_likes::DECIMAL / GREATEST(target_total_swipes, 1))
    ) * 100;
  ELSE
    social_score := 50;
  END IF;

  IF p_event_id IS NOT NULL THEN
    proximity_score := 80;
  ELSE
    proximity_score := 40;
  END IF;

  final_score := (music_score * 0.35) + (behavior_score * 0.25) + (social_score * 0.20) + (proximity_score * 0.20);

  INSERT INTO public.ai_match_scores
    (user_id, target_user_id, event_id, match_score, music_score, behavior_score, social_score, proximity_score)
  VALUES
    (p_user_id, p_target_id, p_event_id, final_score, music_score, behavior_score, social_score, proximity_score)
  ON CONFLICT (user_id, target_user_id, event_id)
  DO UPDATE SET
    match_score = final_score, music_score = EXCLUDED.music_score,
    behavior_score = EXCLUDED.behavior_score, social_score = EXCLUDED.social_score,
    proximity_score = EXCLUDED.proximity_score, computed_at = NOW();

  RETURN json_build_object(
    'match_score', ROUND(final_score, 1),
    'music_score', ROUND(music_score, 1),
    'behavior_score', ROUND(behavior_score, 1),
    'social_score', ROUND(social_score, 1),
    'proximity_score', ROUND(proximity_score, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- predict_crowd RPC
CREATE OR REPLACE FUNCTION public.predict_crowd(p_event_id UUID)
RETURNS JSON AS $$
DECLARE
  evt RECORD;
  venue_avg DECIMAL;
  venue_count INTEGER;
  day_of_week INTEGER;
  day_multiplier DECIMAL;
  genre_multiplier DECIMAL;
  signal_count INTEGER;
  wishlist_count INTEGER;
  predicted INTEGER;
  peak_hour TEXT;
  vibe TEXT;
  confidence DECIMAL;
BEGIN
  SELECT * INTO evt FROM public.events WHERE id = p_event_id;
  IF evt IS NULL THEN RETURN json_build_object('error', 'Event not found'); END IF;

  SELECT AVG(cnt), COUNT(*) INTO venue_avg, venue_count FROM (
    SELECT ec.event_id, COUNT(*) as cnt FROM public.event_checkins ec
    JOIN public.events e ON e.id = ec.event_id
    WHERE e.venue_name = evt.venue_name
    GROUP BY ec.event_id
  ) sub;

  IF venue_avg IS NULL THEN venue_avg := 30; END IF;

  day_of_week := EXTRACT(DOW FROM evt.date);
  day_multiplier := CASE
    WHEN day_of_week = 5 THEN 1.2
    WHEN day_of_week = 6 THEN 1.4
    WHEN day_of_week = 0 THEN 0.8
    ELSE 0.6 END;

  genre_multiplier := CASE
    WHEN 'techno' = ANY(evt.music_genres) THEN 1.3
    WHEN 'house' = ANY(evt.music_genres) THEN 1.2
    WHEN 'disco' = ANY(evt.music_genres) THEN 1.1
    ELSE 1.0 END;

  SELECT COUNT(*) INTO signal_count FROM public.event_signals WHERE event_id = p_event_id;
  SELECT COUNT(*) INTO wishlist_count FROM public.event_wishlists WHERE event_id = p_event_id;

  predicted := ROUND(venue_avg * day_multiplier * genre_multiplier + (signal_count * 2) + (wishlist_count * 3));
  predicted := LEAST(predicted, COALESCE(evt.capacity, 999));

  peak_hour := CASE
    WHEN 'techno' = ANY(evt.music_genres) THEN '02:00'
    WHEN 'house' = ANY(evt.music_genres) THEN '01:00'
    ELSE '00:30' END;

  vibe := CASE
    WHEN predicted > COALESCE(evt.capacity, 200) * 0.8 THEN 'packed'
    WHEN predicted > COALESCE(evt.capacity, 200) * 0.5 THEN 'energetic'
    WHEN predicted > COALESCE(evt.capacity, 200) * 0.2 THEN 'chill'
    ELSE 'intimate' END;

  confidence := LEAST(0.5 + (venue_count * 0.05) + (signal_count * 0.02) + (wishlist_count * 0.03), 0.95);

  INSERT INTO public.ai_crowd_predictions
    (event_id, predicted_attendance, predicted_peak_hour, predicted_vibe, confidence, factors)
  VALUES (p_event_id, predicted, peak_hour, vibe, confidence,
    json_build_object(
      'venue_avg', venue_avg, 'day_multiplier', day_multiplier,
      'genre_multiplier', genre_multiplier, 'signals', signal_count,
      'wishlists', wishlist_count, 'history_events', venue_count
    ))
  ON CONFLICT (event_id) DO UPDATE SET
    predicted_attendance = predicted, predicted_peak_hour = peak_hour,
    predicted_vibe = vibe, confidence = confidence, factors = EXCLUDED.factors, computed_at = NOW();

  RETURN json_build_object(
    'predicted_attendance', predicted,
    'predicted_peak_hour', peak_hour,
    'predicted_vibe', vibe,
    'confidence', ROUND(confidence, 2)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- get_personalized_events RPC
CREATE OR REPLACE FUNCTION public.get_personalized_events(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  event_id UUID,
  relevance_score DECIMAL,
  relevance_reasons TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH user_profile AS (
    SELECT music_preferences, city FROM public.profiles WHERE user_id = p_user_id
  ),
  user_venues AS (
    SELECT e.venue_name, COUNT(*) as visit_count
    FROM public.event_checkins ec
    JOIN public.events e ON e.id = ec.event_id
    WHERE ec.user_id = p_user_id
    GROUP BY e.venue_name
  ),
  user_genres AS (
    SELECT UNNEST(e.music_genres) as genre, COUNT(*) as genre_count
    FROM public.event_checkins ec
    JOIN public.events e ON e.id = ec.event_id
    WHERE ec.user_id = p_user_id
    GROUP BY genre
  ),
  user_liked_profiles AS (
    SELECT UNNEST(p.music_preferences) as liked_genre, COUNT(*) as like_count
    FROM public.swipes s
    JOIN public.profiles p ON p.user_id = s.swiped_id
    WHERE s.swiper_id = p_user_id AND s.action = 'like'
    GROUP BY liked_genre
  )
  SELECT
    e.id as event_id,
    (
      COALESCE((
        SELECT SUM(CASE WHEN ug.genre = ANY(e.music_genres) THEN LEAST(ug.genre_count * 10, 40) ELSE 0 END)
        FROM user_genres ug
      ), 0) +
      COALESCE((
        SELECT LEAST(uv.visit_count * 5, 25) FROM user_venues uv WHERE uv.venue_name = e.venue_name
      ), 0) +
      COALESCE((
        SELECT COUNT(*) * 5 FROM user_profile up
        WHERE up.music_preferences && e.music_genres
      ), 0) +
      COALESCE((
        SELECT SUM(CASE WHEN ulp.liked_genre = ANY(e.music_genres) THEN LEAST(ulp.like_count * 3, 15) ELSE 0 END)
        FROM user_liked_profiles ulp
      ), 0)
    )::DECIMAL as relevance_score,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN EXISTS (SELECT 1 FROM user_venues uv WHERE uv.venue_name = e.venue_name)
        THEN 'You''ve been to ' || e.venue_name || ' before' END,
      CASE WHEN EXISTS (SELECT 1 FROM user_genres ug WHERE ug.genre = ANY(e.music_genres))
        THEN 'Matches your music taste' END,
      CASE WHEN EXISTS (SELECT 1 FROM user_liked_profiles ulp WHERE ulp.liked_genre = ANY(e.music_genres))
        THEN 'People you like enjoy this genre' END
    ], NULL) as relevance_reasons
  FROM public.events e
  WHERE e.date >= CURRENT_DATE
  ORDER BY relevance_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- compute_scene_health RPC
CREATE OR REPLACE FUNCTION public.compute_scene_health(p_venue_name TEXT, p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON AS $$
DECLARE
  pos_signals INTEGER;
  neg_signals INTEGER;
  avg_rating DECIMAL;
  checkin_count INTEGER;
  capacity INTEGER;
  health INTEGER;
  trust TEXT;
  density TEXT;
BEGIN
  SELECT COUNT(*) INTO pos_signals FROM public.vibe_signals
  WHERE venue_name = p_venue_name
  AND created_at::date = p_date
  AND signal_type IN ('fire', 'heart', 'music', 'dancing', 'energy_high', 'good_music', 'great_sound');

  SELECT COUNT(*) INTO neg_signals FROM public.vibe_signals
  WHERE venue_name = p_venue_name
  AND created_at::date = p_date
  AND signal_type IN ('warning', 'report', 'unsafe', 'bad_vibes', 'energy_low');

  SELECT AVG(r.rating) INTO avg_rating FROM public.event_reviews r
  JOIN public.events e ON e.id = r.event_id
  WHERE e.venue_name = p_venue_name
  AND r.created_at > NOW() - INTERVAL '30 days';

  SELECT COUNT(*) INTO checkin_count FROM public.event_checkins ec
  JOIN public.events e ON e.id = ec.event_id
  WHERE e.venue_name = p_venue_name AND e.date = p_date;

  SELECT venue_capacity INTO capacity FROM public.profiles
  WHERE venue_name = p_venue_name AND account_type = 'club_venue' LIMIT 1;

  health := GREATEST(0, LEAST(100,
    50
    + (pos_signals * 5)
    - (neg_signals * 15)
    + COALESCE((avg_rating - 3) * 10, 0)::INTEGER
  ));

  trust := CASE
    WHEN health >= 80 THEN 'excellent'
    WHEN health >= 60 THEN 'good'
    WHEN health >= 40 THEN 'moderate'
    ELSE 'caution' END;

  density := CASE
    WHEN capacity IS NULL THEN 'unknown'
    WHEN checkin_count::DECIMAL / GREATEST(capacity, 1) > 0.9 THEN 'overcrowded'
    WHEN checkin_count::DECIMAL / GREATEST(capacity, 1) > 0.6 THEN 'high'
    WHEN checkin_count::DECIMAL / GREATEST(capacity, 1) > 0.3 THEN 'medium'
    ELSE 'low' END;

  INSERT INTO public.ai_scene_health (venue_name, date, health_score, trust_level, positive_signals, negative_signals, review_sentiment, crowd_density)
  VALUES (p_venue_name, p_date, health, trust, pos_signals, neg_signals, avg_rating, density)
  ON CONFLICT (venue_name, date) DO UPDATE SET
    health_score = health, trust_level = trust, positive_signals = pos_signals,
    negative_signals = neg_signals, review_sentiment = avg_rating, crowd_density = density, computed_at = NOW();

  RETURN json_build_object(
    'health_score', health,
    'trust_level', trust,
    'crowd_density', density,
    'positive_signals', pos_signals,
    'negative_signals', neg_signals,
    'avg_rating', ROUND(COALESCE(avg_rating, 0), 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
