-- Candidate list for Party of the Month voting (all events in the current month).
CREATE OR REPLACE FUNCTION public.get_party_of_month_candidates()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_month INT := EXTRACT(MONTH FROM now());
  v_year INT := EXTRACT(YEAR FROM now());
  v_result JSON;
BEGIN
  WITH bounds AS (
    SELECT date_trunc('month', now())::date AS m_start,
           (date_trunc('month', now()) + interval '1 month')::date AS m_end
  ),
  cand AS (
    SELECT e.id, e.title, e.venue_name, e.date, e.image_url
    FROM public.events e, bounds b
    WHERE e.date >= b.m_start AND e.date < b.m_end
  ),
  agg AS (
    SELECT c.id,
      COALESCE(AVG(r.rating), 0) AS avg_rating,
      COUNT(DISTINCT r.id) AS review_count,
      COUNT(DISTINCT v.id) AS vote_count
    FROM cand c
    LEFT JOIN public.event_reviews r ON r.event_id = c.id
    LEFT JOIN public.best_party_votes v ON v.event_id = c.id AND v.month = v_month AND v.year = v_year
    GROUP BY c.id
  )
  SELECT json_agg(json_build_object(
    'event_id', c.id,
    'title', c.title,
    'venue_name', c.venue_name,
    'date', c.date,
    'image_url', c.image_url,
    'vote_count', a.vote_count,
    'avg_rating', ROUND(a.avg_rating, 2),
    'user_voted', EXISTS (SELECT 1 FROM public.best_party_votes bv WHERE bv.user_id = v_user AND bv.event_id = c.id AND bv.month = v_month AND bv.year = v_year)
  ) ORDER BY a.vote_count DESC, a.avg_rating DESC)
  INTO v_result
  FROM cand c JOIN agg a ON a.id = c.id;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;
