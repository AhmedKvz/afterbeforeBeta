-- Dance Floor — accelerometer-scored dance sessions + leaderboard.
-- A "night" clamps early-AM (before 6) to the previous calendar day so a
-- Sat-night → Sun-05:00 session still counts as Saturday.

CREATE TABLE IF NOT EXISTS public.dance_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id    uuid,
  venue_name  text,
  score       int  NOT NULL DEFAULT 0,
  moves       int  NOT NULL DEFAULT 0,
  duration_s  int  NOT NULL DEFAULT 0,
  night       date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dance_sessions_night_score_idx ON public.dance_sessions (night, score DESC);

ALTER TABLE public.dance_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own dance sessions" ON public.dance_sessions;
CREATE POLICY "own dance sessions" ON public.dance_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert own dance" ON public.dance_sessions;
CREATE POLICY "insert own dance" ON public.dance_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- helper: current "night" date
CREATE OR REPLACE FUNCTION public._dance_night()
RETURNS date LANGUAGE sql STABLE AS $$
  SELECT (CASE WHEN extract(hour FROM now()) < 6 THEN now() - interval '1 day' ELSE now() END)::date;
$$;

-- save a session (server stamps user + night)
CREATE OR REPLACE FUNCTION public.save_dance_session(
  p_score int, p_moves int, p_duration int, p_venue uuid, p_venue_name text
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_night date; v_id uuid; v_rank int;
BEGIN
  v_night := public._dance_night();
  INSERT INTO public.dance_sessions(user_id, venue_id, venue_name, score, moves, duration_s, night)
  VALUES (auth.uid(), p_venue, p_venue_name, GREATEST(p_score,0), GREATEST(p_moves,0), GREATEST(p_duration,0), v_night)
  RETURNING id INTO v_id;

  -- the user's rank tonight (by their best score)
  SELECT count(*) + 1 INTO v_rank FROM (
    SELECT user_id, max(score) ms FROM public.dance_sessions WHERE night = v_night GROUP BY user_id
  ) q WHERE q.ms > (SELECT max(score) FROM public.dance_sessions WHERE night = v_night AND user_id = auth.uid());

  RETURN json_build_object('id', v_id, 'night', v_night, 'rank', v_rank);
END; $$;
GRANT EXECUTE ON FUNCTION public.save_dance_session(int,int,int,uuid,text) TO authenticated;

-- leaderboard: best score per user for a scope (night | week | all)
CREATE OR REPLACE FUNCTION public.get_dance_leaderboard(p_scope text DEFAULT 'night')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_since date;
BEGIN
  v_since := CASE p_scope
    WHEN 'week' THEN (now() - interval '7 days')::date
    WHEN 'all'  THEN '2000-01-01'::date
    ELSE public._dance_night()
  END;
  RETURN COALESCE((
    SELECT json_agg(row_to_json(t)) FROM (
      SELECT p.display_name, p.avatar_url, d.user_id,
             max(d.score) AS score, sum(d.moves) AS moves
      FROM public.dance_sessions d
      JOIN public.profiles p ON p.user_id = d.user_id
      WHERE d.night >= v_since
      GROUP BY d.user_id, p.display_name, p.avatar_url
      ORDER BY max(d.score) DESC
      LIMIT 50
    ) t
  ), '[]'::json);
END; $$;
GRANT EXECUTE ON FUNCTION public.get_dance_leaderboard(text) TO authenticated;
