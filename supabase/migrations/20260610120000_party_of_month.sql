-- Party of the Month — hybrid pick (quality + activity + recency + votes) with voting via a monthly quest.

-- 1. Votes table — one vote per user per month, re-voting moves the vote.
CREATE TABLE IF NOT EXISTS public.best_party_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month, year)
);
CREATE INDEX IF NOT EXISTS idx_bpv_event ON public.best_party_votes(event_id);
CREATE INDEX IF NOT EXISTS idx_bpv_period ON public.best_party_votes(year, month);

ALTER TABLE public.best_party_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view party votes" ON public.best_party_votes FOR SELECT USING (true);
CREATE POLICY "Users cast own vote"       ON public.best_party_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own vote"     ON public.best_party_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own vote"     ON public.best_party_votes FOR DELETE USING (auth.uid() = user_id);

-- 2. Cast (or move) the current user's vote for this month.
CREATE OR REPLACE FUNCTION public.cast_party_of_month_vote(p_event_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  UUID := auth.uid();
  v_month INT  := EXTRACT(MONTH FROM now());
  v_year  INT  := EXTRACT(YEAR  FROM now());
  v_count INT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.best_party_votes (user_id, event_id, month, year)
  VALUES (v_user, p_event_id, v_month, v_year)
  ON CONFLICT (user_id, month, year)
  DO UPDATE SET event_id = EXCLUDED.event_id, created_at = now();

  SELECT COUNT(*) INTO v_count
  FROM public.best_party_votes
  WHERE event_id = p_event_id AND month = v_month AND year = v_year;

  RETURN json_build_object('event_id', p_event_id, 'vote_count', v_count, 'voted', true);
END;
$$;

-- 3. Compute the Party of the Month — blended score over events dated in the current month.
--    score = 0.35*quality + 0.30*activity + 0.35*votes, scaled by a recency factor.
CREATE OR REPLACE FUNCTION public.get_party_of_month()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user   UUID := auth.uid();
  v_month  INT  := EXTRACT(MONTH FROM now());
  v_year   INT  := EXTRACT(YEAR  FROM now());
  v_result JSON;
BEGIN
  WITH bounds AS (
    SELECT date_trunc('month', now())::date AS m_start,
           (date_trunc('month', now()) + interval '1 month')::date AS m_end
  ),
  cand AS (
    SELECT e.id
    FROM public.events e, bounds b
    WHERE e.date >= b.m_start AND e.date < b.m_end
  ),
  agg AS (
    SELECT c.id,
      COALESCE(AVG(r.rating), 0)        AS avg_rating,
      COUNT(DISTINCT r.id)              AS review_count,
      COUNT(DISTINCT s.id)              AS signal_count,
      COUNT(DISTINCT ci.id)             AS checkin_count,
      COUNT(DISTINCT v.id)              AS vote_count,
      GREATEST(
        COALESCE(MAX(r.created_at),    'epoch'::timestamptz),
        COALESCE(MAX(s.created_at),    'epoch'::timestamptz),
        COALESCE(MAX(ci.checked_in_at),'epoch'::timestamptz),
        COALESCE(MAX(v.created_at),    'epoch'::timestamptz)
      ) AS latest_at
    FROM cand c
    LEFT JOIN public.event_reviews   r  ON r.event_id  = c.id
    LEFT JOIN public.event_signals   s  ON s.event_id  = c.id
    LEFT JOIN public.event_checkins  ci ON ci.event_id = c.id
    LEFT JOIN public.best_party_votes v ON v.event_id  = c.id AND v.month = v_month AND v.year = v_year
    GROUP BY c.id
  ),
  norm AS (
    SELECT a.*,
      (a.signal_count + a.checkin_count + a.review_count) AS activity,
      MAX(a.signal_count + a.checkin_count + a.review_count) OVER () AS max_activity,
      MAX(a.vote_count) OVER () AS max_votes
    FROM agg a
  ),
  scored AS (
    SELECT n.*,
      ( 0.35 * (n.avg_rating / 5.0)
      + 0.30 * (n.activity::numeric   / NULLIF(n.max_activity, 0))
      + 0.35 * (n.vote_count::numeric / NULLIF(n.max_votes, 0)) )
      * CASE
          WHEN n.latest_at > 'epoch'::timestamptz
          THEN GREATEST(0.5, 1 - (EXTRACT(EPOCH FROM (now() - n.latest_at)) / 3600.0) / 720.0)
          ELSE 0.5
        END AS score
    FROM norm n
  ),
  winner AS (
    SELECT * FROM scored ORDER BY score DESC NULLS LAST, vote_count DESC LIMIT 1
  )
  SELECT json_build_object(
    'event',       row_to_json(e),
    'score',       ROUND(COALESCE(w.score, 0)::numeric, 4),
    'vote_count',  w.vote_count,
    'avg_rating',  ROUND(w.avg_rating, 2),
    'review_count',w.review_count,
    'activity',    w.activity,
    'user_voted',  EXISTS (
      SELECT 1 FROM public.best_party_votes bv
      WHERE bv.user_id = v_user AND bv.event_id = w.id AND bv.month = v_month AND bv.year = v_year
    )
  )
  INTO v_result
  FROM winner w
  JOIN public.events e ON e.id = w.id;

  RETURN v_result;  -- NULL when there are no events in the current month
END;
$$;

-- 4. Seed the monthly voting quest (idempotent).
INSERT INTO public.quests (title, description, quest_type, target_count, xp_reward, icon)
SELECT 'Party Curator', 'Vote for the Party of the Month', 'vote_best_party', 1, 100, '🗳️'
WHERE NOT EXISTS (SELECT 1 FROM public.quests WHERE quest_type = 'vote_best_party');
