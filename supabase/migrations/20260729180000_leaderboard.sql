-- LEADERBOARD (founder 2026-07-29): tabela učesnika u Misije hubu.
-- Skala: mesec (određuje top 3 za mesečnu nagradu iznenađenja), godina,
-- i po mestu (ko je domaći na kom mestu). Metrika = POŠTEN broj: check-inovi
-- (verifikovani dolasci), tiebreak broj različitih mesta — nikad potrošnja.
-- Nagrade iznenađenja dodeljuje founder ručno iz War Room-a (ISPLATE ≤ FOND).

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_scope text DEFAULT 'month', p_venue uuid DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); from_ts timestamptz;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  from_ts := CASE
    WHEN p_scope = 'year' THEN date_trunc('year', now())
    ELSE date_trunc('month', now())
  END;
  RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
    SELECT p.user_id, p.display_name, p.avatar_url,
           count(*)::int AS checkins,
           count(DISTINCT c.venue_id)::int AS venues,
           (p.user_id = v) AS me
    FROM public.venue_checkins c
    JOIN public.profiles p ON p.user_id = c.user_id
    WHERE c.created_at >= from_ts
      AND (p_venue IS NULL OR c.venue_id = p_venue)
      AND p.display_name IS NOT NULL
    GROUP BY p.user_id, p.display_name, p.avatar_url
    ORDER BY count(*) DESC, count(DISTINCT c.venue_id) DESC, min(c.created_at) ASC
    LIMIT 20
  ) t), '[]'::json);
END;$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, uuid) TO authenticated;
