-- LJUDI (HANDOFF-LJUDI-2026-08-03): upoznavanje odvojeno od live check-ina —
-- aktivno cele nedelje, dva moda: 'dates' (1 na 1) i 'crew' (ekipa).
-- SVE JE FREE: nema boost/premium/„ko te lajkovao" — ni u UI ni u bazi.
-- Kartica = pasoš: identitet iz PRAVIH check-inova + co-presence signal
-- („bili ste iste noći u X") koji nijedna dating aplikacija nema.
-- Match ide kroz POSTOJEĆU infrastrukturu (ensure_conversation → PORUKE).
-- Kill-switch: app_settings.meet_enabled.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS open_dates boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS open_crew  boolean NOT NULL DEFAULT false;

INSERT INTO public.app_settings (key, value) VALUES ('meet_enabled', 'true')
  ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.meet_swipes (
  from_user uuid NOT NULL,
  to_user   uuid NOT NULL,
  mode      text NOT NULL CHECK (mode IN ('dates', 'crew')),
  liked     boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (from_user, to_user, mode)
);
CREATE INDEX IF NOT EXISTS idx_meet_swipes_rev ON public.meet_swipes(to_user, mode, liked);
CREATE INDEX IF NOT EXISTS idx_meet_swipes_rate ON public.meet_swipes(from_user, mode, created_at DESC);
ALTER TABLE public.meet_swipes ENABLE ROW LEVEL SECURITY;
-- RLS deny-all: sav pristup ide kroz SECURITY DEFINER RPC (nikad direktan
-- select — „ko me je lajkovao" ne sme da iscuri ni slučajno).

/* ── DECK ── */
CREATE OR REPLACE FUNCTION public.get_meet_deck(p_mode text DEFAULT 'dates')
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v uuid := auth.uid();
  on_flag boolean;
  me_open boolean;
  my_genres text[];
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_mode NOT IN ('dates', 'crew') THEN RAISE EXCEPTION 'BAD_MODE'; END IF;

  SELECT (value = 'true') INTO on_flag FROM public.app_settings WHERE key = 'meet_enabled';
  IF NOT COALESCE(on_flag, false) THEN RAISE EXCEPTION 'DISABLED'; END IF;

  SELECT CASE WHEN p_mode = 'dates' THEN COALESCE(open_dates, false) ELSE COALESCE(open_crew, false) END,
         COALESCE(music_preferences, '{}')
    INTO me_open, my_genres
    FROM public.profiles WHERE user_id = v;
  IF NOT COALESCE(me_open, false) THEN RAISE EXCEPTION 'NOT_OPTED_IN'; END IF;

  RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
    SELECT
      p.user_id, p.display_name, p.avatar_url, p.cover_url, p.bio, p.city,
      COALESCE(p.music_preferences, '{}') AS music_preferences,
      -- top 3 mesta po broju stvarnih check-inova (pošten broj, bez izmišljanja)
      COALESCE((
        SELECT json_agg(x.name ORDER BY x.n DESC)
        FROM (SELECT vn.name, count(*) AS n
              FROM public.venue_checkins c2 JOIN public.venues vn ON vn.id = c2.venue_id
              WHERE c2.user_id = p.user_id GROUP BY vn.name ORDER BY count(*) DESC LIMIT 3) x
      ), '[]'::json) AS top_venues,
      -- broj različitih noći (nightlife logika: <6h = prethodni datum)
      (SELECT count(DISTINCT public.nightlife_date_of(c3.created_at))
         FROM public.venue_checkins c3 WHERE c3.user_id = p.user_id)::int AS nights,
      -- mesta na kojima smo OBOJE bili (ikad)
      (SELECT count(*) FROM (
         SELECT venue_id FROM public.venue_checkins WHERE user_id = p.user_id
         INTERSECT
         SELECT venue_id FROM public.venue_checkins WHERE user_id = v) si)::int AS shared_venues,
      -- ISTA NOĆ, ISTO MESTO — ubica-signal
      (SELECT count(*) FROM (
         SELECT DISTINCT a.venue_id, public.nightlife_date_of(a.created_at) AS nd
         FROM public.venue_checkins a
         JOIN public.venue_checkins b
           ON b.venue_id = a.venue_id
          AND public.nightlife_date_of(b.created_at) = public.nightlife_date_of(a.created_at)
         WHERE a.user_id = v AND b.user_id = p.user_id) tg)::int AS together,
      (SELECT json_build_object('venue', vn2.name, 'night', tg2.nd)
         FROM (
           SELECT DISTINCT a.venue_id, public.nightlife_date_of(a.created_at) AS nd
           FROM public.venue_checkins a
           JOIN public.venue_checkins b
             ON b.venue_id = a.venue_id
            AND public.nightlife_date_of(b.created_at) = public.nightlife_date_of(a.created_at)
           WHERE a.user_id = v AND b.user_id = p.user_id
           ORDER BY 2 DESC LIMIT 1) tg2
         JOIN public.venues vn2 ON vn2.id = tg2.venue_id) AS together_last,
      -- poredak: zajedničke noći → preklapanje žanrova → skorija aktivnost
      (SELECT count(*) FROM unnest(COALESCE(p.music_preferences, '{}')) g
        WHERE g = ANY(my_genres))::int AS genre_overlap,
      (SELECT max(c4.created_at) FROM public.venue_checkins c4 WHERE c4.user_id = p.user_id) AS last_seen
    FROM public.profiles p
    WHERE p.user_id <> v
      AND p.display_name IS NOT NULL
      AND CASE WHEN p_mode = 'dates' THEN COALESCE(p.open_dates, false) ELSE COALESCE(p.open_crew, false) END
      AND NOT EXISTS (SELECT 1 FROM public.meet_swipes s
                       WHERE s.from_user = v AND s.to_user = p.user_id AND s.mode = p_mode)
      AND NOT EXISTS (SELECT 1 FROM public.blocks b
                       WHERE (b.blocker_id = v AND b.blocked_id = p.user_id)
                          OR (b.blocker_id = p.user_id AND b.blocked_id = v))
      -- već pričamo → nije u decku
      AND NOT EXISTS (SELECT 1 FROM public.conversations cv
                       WHERE (cv.user_a = LEAST(v, p.user_id) AND cv.user_b = GREATEST(v, p.user_id)))
    ORDER BY together DESC, genre_overlap DESC, last_seen DESC NULLS LAST
    LIMIT 15
  ) t), '[]'::json);
END;$$;

/* ── SWIPE ── */
CREATE OR REPLACE FUNCTION public.meet_swipe(p_to uuid, p_mode text, p_like boolean)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v uuid := auth.uid();
  on_flag boolean;
  me_open boolean;
  they_open boolean;
  recent int;
  reciprocal boolean;
  v_cid uuid;
  partner record;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_mode NOT IN ('dates', 'crew') THEN RAISE EXCEPTION 'BAD_MODE'; END IF;
  IF p_to = v THEN RAISE EXCEPTION 'SELF'; END IF;

  SELECT (value = 'true') INTO on_flag FROM public.app_settings WHERE key = 'meet_enabled';
  IF NOT COALESCE(on_flag, false) THEN RAISE EXCEPTION 'DISABLED'; END IF;

  SELECT CASE WHEN p_mode = 'dates' THEN COALESCE(open_dates, false) ELSE COALESCE(open_crew, false) END
    INTO me_open FROM public.profiles WHERE user_id = v;
  IF NOT COALESCE(me_open, false) THEN RAISE EXCEPTION 'NOT_OPTED_IN'; END IF;

  SELECT CASE WHEN p_mode = 'dates' THEN COALESCE(open_dates, false) ELSE COALESCE(open_crew, false) END
    INTO they_open FROM public.profiles WHERE user_id = p_to;
  IF NOT COALESCE(they_open, false) THEN RAISE EXCEPTION 'TARGET_CLOSED'; END IF;

  IF EXISTS (SELECT 1 FROM public.blocks b
              WHERE (b.blocker_id = v AND b.blocked_id = p_to)
                 OR (b.blocker_id = p_to AND b.blocked_id = v)) THEN
    RAISE EXCEPTION 'BLOCKED';
  END IF;

  -- rate limit: 50 / 24h po modu (anti-spam, ne monetizacija)
  SELECT count(*) INTO recent FROM public.meet_swipes
    WHERE from_user = v AND mode = p_mode AND created_at > now() - interval '24 hours';
  IF recent >= 50 THEN RAISE EXCEPTION 'LIMIT_REACHED'; END IF;

  INSERT INTO public.meet_swipes (from_user, to_user, mode, liked)
    VALUES (v, p_to, p_mode, p_like)
    ON CONFLICT (from_user, to_user, mode)
    DO UPDATE SET liked = EXCLUDED.liked, created_at = now();

  IF NOT p_like THEN RETURN json_build_object('matched', false); END IF;

  SELECT EXISTS (SELECT 1 FROM public.meet_swipes
                  WHERE from_user = p_to AND to_user = v AND mode = p_mode AND liked)
    INTO reciprocal;
  IF NOT reciprocal THEN RETURN json_build_object('matched', false); END IF;

  -- MATCH: postojeća infrastruktura (isti thread kao mutual iskra)
  v_cid := public.ensure_conversation(v, p_to);
  UPDATE public.conversations SET status = 'active' WHERE id = v_cid;
  SELECT user_id, display_name, avatar_url INTO partner
    FROM public.profiles WHERE user_id = p_to;

  RETURN json_build_object(
    'matched', true,
    'conversation_id', v_cid,
    'partner', json_build_object('user_id', partner.user_id, 'name', partner.display_name, 'avatar', partner.avatar_url)
  );
END;$$;

GRANT EXECUTE ON FUNCTION public.get_meet_deck(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.meet_swipe(uuid, text, boolean) TO authenticated;
