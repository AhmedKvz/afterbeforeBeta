-- TABELA v2 (founder 2026-08-03): iz brojača check-inova u RETENTION ENGINE.
-- Broji celokupnu aktivnost — dolasci, recenzije, questovi, vibe signali,
-- najave, odobrene rute, prilozi kampanjama.
--
-- Tri pravila koja drže tablu poštenom:
--  1) PRISUSTVO VREDI NAJVIŠE — dolazak košta celu noć, recenzija 30 sekundi.
--  2) MEKA AKTIVNOST NE SME DA PRESTIGNE DOLASKE (kapa = max(10, bodovi od
--     dolazaka)). Bez ovoga se tabla farmuje sa kauča — što ruši „telo je
--     kontroler" i pravi tačno onu grind-tablu koju scena prezire.
--  3) KONTINUITET SE MNOŽI — dolaziš više nedelja, množilac raste (×1.0→×1.3).
--     Ovo je retention poluga: 4 vikenda zaredom pobeđuju jedan maraton.
--
-- Razbijeni brojevi se vraćaju klijentu (pošteni brojevi: vidiš ZAŠTO si tu).

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_scope text DEFAULT 'month', p_venue uuid DEFAULT NULL)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); from_ts timestamptz; v_name text;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  from_ts := CASE WHEN p_scope = 'year' THEN date_trunc('year', now()) ELSE date_trunc('month', now()) END;
  IF p_venue IS NOT NULL THEN SELECT name INTO v_name FROM public.venues WHERE id = p_venue; END IF;

  RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
    WITH ci AS (  -- dolasci: kičma tabele
      SELECT c.user_id,
             count(*)::int AS checkins,
             count(DISTINCT c.venue_id)::int AS venues,
             count(DISTINCT date_trunc('week', c.created_at))::int AS weeks
        FROM public.venue_checkins c
       WHERE c.created_at >= from_ts
         AND (p_venue IS NULL OR c.venue_id = p_venue)
       GROUP BY c.user_id
    ), rv AS (    -- recenzije (verifikovana poseta vredi više)
      SELECT r.user_id,
             count(*)::int AS reviews,
             count(*) FILTER (WHERE r.verified_visit)::int AS reviews_verified
        FROM public.event_reviews r
       WHERE r.created_at >= from_ts
         AND COALESCE(r.moderation_status, 'ok') <> 'flagged'
         AND (v_name IS NULL OR r.venue_name = v_name)
       GROUP BY r.user_id
    ), qs AS (    -- završeni questovi
      SELECT q.user_id, count(*)::int AS quests
        FROM public.user_quests q
       WHERE q.is_completed AND COALESCE(q.completed_at, q.created_at) >= from_ts
       GROUP BY q.user_id
    ), vs AS (    -- vibe signali
      SELECT s.user_id, count(*)::int AS vibes
        FROM public.vibe_signals s
       WHERE s.created_at >= from_ts AND (v_name IS NULL OR s.venue_name = v_name)
       GROUP BY s.user_id
    ), sg AS (    -- „Idem" najave
      SELECT g.user_id, count(*)::int AS signals
        FROM public.event_signals g
       WHERE g.created_at >= from_ts
       GROUP BY g.user_id
    ), rm AS (    -- odobrene rute (founder kurira → ne može se farmati)
      SELECT m.user_id, count(*)::int AS routes
        FROM public.roadmaps m
       WHERE m.created_at >= from_ts AND m.status = 'approved'
       GROUP BY m.user_id
    ), cs AS (    -- prilozi kampanjama
      SELECT s.user_id, count(*)::int AS posts
        FROM public.campaign_submissions s
       WHERE s.created_at >= from_ts
       GROUP BY s.user_id
    ), base AS (
      SELECT p.user_id, p.display_name, p.avatar_url,
             COALESCE(ci.checkins, 0) AS checkins,
             COALESCE(ci.venues, 0)   AS venues,
             COALESCE(ci.weeks, 0)    AS weeks,
             COALESCE(rv.reviews, 0)  AS reviews,
             COALESCE(rv.reviews_verified, 0) AS reviews_verified,
             COALESCE(qs.quests, 0)   AS quests,
             COALESCE(vs.vibes, 0)    AS vibes,
             COALESCE(sg.signals, 0)  AS signals,
             COALESCE(rm.routes, 0)   AS routes,
             COALESCE(cs.posts, 0)    AS posts
        FROM public.profiles p
        LEFT JOIN ci ON ci.user_id = p.user_id
        LEFT JOIN rv ON rv.user_id = p.user_id
        LEFT JOIN qs ON qs.user_id = p.user_id
        LEFT JOIN vs ON vs.user_id = p.user_id
        LEFT JOIN sg ON sg.user_id = p.user_id
        LEFT JOIN rm ON rm.user_id = p.user_id
        LEFT JOIN cs ON cs.user_id = p.user_id
       WHERE p.display_name IS NOT NULL
         AND (ci.user_id IS NOT NULL OR rv.user_id IS NOT NULL OR qs.user_id IS NOT NULL
              OR vs.user_id IS NOT NULL OR sg.user_id IS NOT NULL OR rm.user_id IS NOT NULL
              OR cs.user_id IS NOT NULL)
    ), scored AS (
      SELECT b.*,
             (b.checkins * 10 + b.venues * 5) AS pts_presence,
             (b.reviews_verified * 6 + (b.reviews - b.reviews_verified) * 2
              + b.quests * 8 + b.vibes * 2 + b.signals * 1
              + b.routes * 15 + b.posts * 10) AS pts_soft_raw,
             CASE WHEN b.weeks >= 4 THEN 1.3 WHEN b.weeks = 3 THEN 1.2
                  WHEN b.weeks = 2 THEN 1.1 ELSE 1.0 END AS streak_mult
        FROM base b
    )
    SELECT s.user_id, s.display_name, s.avatar_url,
           s.checkins, s.venues, s.weeks, s.reviews, s.quests,
           (s.vibes + s.signals) AS signals,
           s.routes, s.posts,
           s.streak_mult,
           s.pts_presence,
           -- meka aktivnost ne sme da prestigne dolaske (pod 10 — nov korisnik se
           -- vidi na tabli, ali ne može da parira onome ko izlazi)
           LEAST(s.pts_soft_raw, GREATEST(10, s.pts_presence))::int AS pts_soft,
           round((s.pts_presence + LEAST(s.pts_soft_raw, GREATEST(10, s.pts_presence))) * s.streak_mult)::int AS score,
           (s.user_id = v) AS me
      FROM scored s
     ORDER BY score DESC, s.checkins DESC, s.venues DESC, s.display_name ASC
     LIMIT 20
  ) t), '[]'::json);
END;$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, uuid) TO authenticated;
