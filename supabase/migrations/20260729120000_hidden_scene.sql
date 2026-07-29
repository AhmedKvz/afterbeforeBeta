-- SKRIVENA SCENA (QUEST-DOKTRINA §6, founder gate odluka 2026-07-29):
-- skrivena mesta alternativne scene (Buvljak, Ada Međica, galerije, pikniki)
-- ulaze u imenik, ali su za beta fazu ZAKLJUČANA levelom — check-in traži
-- profiles.level >= venues.min_level (server gate, parsabilno LEVEL_REQUIRED).
-- Teže dostupno mesto nosi veći REP (rep_multiplier množi SAMO XP, ne AFC —
-- AFC ekonomija ostaje pod ISPLATE ≤ FOND pravilom).
-- Otkrivač mesta (predlog → founder kuracija) nosi trajni kredit na mestu.

-- 1 · kolone
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_level int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rep_multiplier numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS discovered_by uuid,
  ADD COLUMN IF NOT EXISTS discovered_by_name text;

-- 2 · seed — kurirana skrivena mesta (stvarna, javno poznata; koordinate
-- približne — geofence je u beti ionako OFF, founder blocker "koordinate na
-- terenu" važi i ovde pre uključivanja). Radius širok za ostrva/pijace.
INSERT INTO public.venues (name, slug, type, neighborhood, emoji, latitude, longitude, geofence_radius_m, is_partner, is_hidden, min_level, rep_multiplier)
SELECT * FROM (VALUES
  ('Buvljak',             'buvljak',             'market',  'Novi Beograd', '🛍', 44.8065, 20.4123, 200, false, true, 2, 2),
  ('Ada Međica',          'ada-medjica',         'river',   'Sava',         '🛶', 44.7893, 20.3743, 400, false, true, 3, 3),
  ('Veliko ratno ostrvo', 'veliko-ratno-ostrvo', 'river',   'Ušće',         '🏝', 44.8317, 20.4372, 500, false, true, 4, 3),
  ('KC Grad',             'kc-grad',             'gallery', 'Savamala',     '🎨', 44.8129, 20.4506, 120, false, true, 2, 2),
  ('Kvaka 22',            'kvaka-22',            'gallery', 'Palilula',     '🗝', 44.8109, 20.4776, 120, false, true, 2, 2),
  ('Dorćol Platz',        'dorcol-platz',        'gallery', 'Dorćol',       '🏭', 44.8253, 20.4640, 150, false, true, 2, 2),
  ('Piknik na Adi',       'piknik-na-adi',       'river',   'Ada Ciganlija','🧺', 44.7906, 20.4046, 400, false, true, 1, 1.5)
) AS s(name, slug, type, neighborhood, emoji, latitude, longitude, geofence_radius_m, is_partner, is_hidden, min_level, rep_multiplier)
WHERE NOT EXISTS (SELECT 1 FROM public.venues v WHERE v.slug = s.slug OR lower(v.name) = lower(s.name));

-- 2b · mesta koja su VEĆ bila u imeniku (raniji seed) prelaze u skriveni tier
UPDATE public.venues SET is_hidden = true, min_level = 2, rep_multiplier = 2
  WHERE lower(name) IN ('kc grad', 'kvaka 22', 'dorćol platz', 'dorcol platz')
    AND is_hidden = false;

-- 3 · check-in gate + REP multiplikator (prepis process_secure_checkin)
CREATE OR REPLACE FUNCTION public.process_secure_checkin(p_venue uuid, p_lat double precision, p_lon double precision)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_now TIMESTAMPTZ := now();
  v_local TIMESTAMPTZ := now() AT TIME ZONE 'Europe/Belgrade';
  v_hour INT;
  v_min INT;
  v_vlat DOUBLE PRECISION;
  v_vlon DOUBLE PRECISION;
  v_radius INT;
  v_minlevel INT;
  v_repmult NUMERIC;
  v_hidden BOOLEAN;
  v_userlevel INT;
  v_dist DOUBLE PRECISION;
  v_geo_enforced BOOLEAN;
  v_night_enforced BOOLEAN;
  v_flags TEXT[] := '{}';
  v_last RECORD;
  v_speed DOUBLE PRECISION;
  v_crew INT;
  v_early BOOLEAN := false;
  v_mult_xp NUMERIC := 1;
  v_mult_afc NUMERIC := 1;
  v_xp INT;
  v_afc INT;
  v_bal INT;
  v_newbal INT;
  v_newxp INT;
  v_newlevel INT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT latitude, longitude, GREATEST(COALESCE(geofence_radius_m, 100), 50),
         COALESCE(min_level, 0), COALESCE(rep_multiplier, 1), COALESCE(is_hidden, false)
    INTO v_vlat, v_vlon, v_radius, v_minlevel, v_repmult, v_hidden
    FROM public.venues WHERE id = p_venue;
  IF v_vlat IS NULL THEN RAISE EXCEPTION 'Venue not found or missing coordinates'; END IF;

  -- SKRIVENA SCENA gate: parsabilno 'LEVEL_REQUIRED <min> <moj>'
  SELECT COALESCE(level, 1) INTO v_userlevel FROM public.profiles WHERE user_id = v_user;
  IF v_minlevel > COALESCE(v_userlevel, 1) THEN
    RAISE EXCEPTION 'LEVEL_REQUIRED % %', v_minlevel, COALESCE(v_userlevel, 1);
  END IF;

  v_dist := public.haversine_m(p_lat, p_lon, v_vlat, v_vlon);
  v_hour := EXTRACT(HOUR FROM v_local)::int;
  v_min  := EXTRACT(MINUTE FROM v_local)::int;

  SELECT (value = 'true') INTO v_geo_enforced   FROM public.app_settings WHERE key = 'geofence_enforced';
  SELECT (value = 'true') INTO v_night_enforced FROM public.app_settings WHERE key = 'nightlife_enforced';
  v_geo_enforced   := COALESCE(v_geo_enforced, false);
  v_night_enforced := COALESCE(v_night_enforced, false);

  IF EXISTS (SELECT 1 FROM public.venue_checkins
             WHERE user_id = v_user AND venue_id = p_venue AND created_at > v_now - interval '12 hours') THEN
    RAISE EXCEPTION 'Already checked in here in the last 12 hours';
  END IF;

  SELECT created_at, lat, lon INTO v_last FROM public.venue_checkins
    WHERE user_id = v_user ORDER BY created_at DESC LIMIT 1;
  IF v_last.created_at IS NOT NULL THEN
    v_speed := public.haversine_m(v_last.lat, v_last.lon, p_lat, p_lon)
               / GREATEST(EXTRACT(EPOCH FROM (v_now - v_last.created_at)), 1);
    IF v_speed > 55 THEN v_flags := array_append(v_flags, 'spoof_speed'); END IF;
  END IF;

  -- Nightlife prozor: skrivena DNEVNA mesta (buvljak, ada, galerije) su izuzeta
  -- — njihova scena živi danju; klupski prozor za njih nema smisla.
  IF NOT (v_hour >= 20 OR v_hour < 6) THEN
    v_flags := array_append(v_flags, 'outside_nightlife');
    IF v_night_enforced AND NOT v_hidden THEN
      RAISE EXCEPTION 'Check-in only during nightlife hours (20:00–06:00)';
    END IF;
  END IF;

  IF v_dist > v_radius THEN
    v_flags := array_append(v_flags, 'far');
    IF v_geo_enforced THEN
      RAISE EXCEPTION 'TOO_FAR % %', round(v_dist), v_radius;
    END IF;
  END IF;

  v_early := (v_hour >= 20) OR (v_hour = 0 AND v_min <= 30);

  SELECT COUNT(DISTINCT user_id) INTO v_crew FROM public.venue_checkins
    WHERE venue_id = p_venue AND user_id <> v_user AND created_at > v_now - interval '3 hours';
  v_crew := COALESCE(v_crew, 0) + 1;
  IF v_crew >= 3 THEN
    v_mult_xp := 1.5; v_mult_afc := 1.2; v_flags := array_append(v_flags, 'crew');
  END IF;

  -- Težinski REP: teže dostupno mesto množi XP (SAMO XP — AFC fond netaknut)
  IF v_repmult > 1 THEN
    v_mult_xp := v_mult_xp * v_repmult;
    v_flags := array_append(v_flags, 'hidden');
  END IF;

  v_xp  := floor(50 * v_mult_xp)::int;
  v_afc := floor((100 + CASE WHEN v_early THEN 50 ELSE 0 END) * v_mult_afc)::int;

  INSERT INTO public.xp_transactions (user_id, amount, reason) VALUES (v_user, v_xp, 'Check-in');

  SELECT COALESCE(spendable_xp, 0) INTO v_bal FROM public.profiles WHERE user_id = v_user;
  v_newbal := v_bal + v_afc;
  INSERT INTO public.afc_ledger (user_id, delta, reason, ref_type, ref_id, balance_after)
  VALUES (v_user, v_afc, 'checkin', 'venue', p_venue, v_newbal);

  UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + v_xp, spendable_xp = v_newbal
    WHERE user_id = v_user
    RETURNING xp INTO v_newxp;
  v_newlevel := public.level_from_xp(v_newxp);
  UPDATE public.profiles SET level = v_newlevel WHERE user_id = v_user;

  INSERT INTO public.venue_checkins
    (user_id, venue_id, lat, lon, distance_m, awarded_xp, awarded_afc, early_bird, crew_size, flags)
  VALUES (v_user, p_venue, p_lat, p_lon, v_dist, v_xp, v_afc, v_early, v_crew, v_flags);

  RETURN json_build_object(
    'ok', true,
    'distance_m', round(v_dist)::int,
    'radius_m', v_radius,
    'awarded_xp', v_xp,
    'awarded_afc', v_afc,
    'early_bird', v_early,
    'crew_size', v_crew,
    'flags', v_flags,
    'afc_balance', v_newbal,
    'level', v_newlevel
  );
END;
$function$;

-- 4 · „Znaš mesto?" — predlog → founder kuracija → OTKRIO/LA kredit
CREATE TABLE IF NOT EXISTS public.venue_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  area text,
  why text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  venue_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
ALTER TABLE public.venue_suggestions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.suggest_venue(p_name text, p_area text DEFAULT NULL, p_why text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); nid uuid;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF coalesce(btrim(p_name), '') = '' THEN RAISE EXCEPTION 'NAME_REQUIRED'; END IF;
  IF (SELECT count(*) FROM public.venue_suggestions WHERE user_id = v AND status = 'pending') >= 3 THEN
    RAISE EXCEPTION 'TOO_MANY_PENDING';
  END IF;
  IF EXISTS (SELECT 1 FROM public.venues WHERE lower(name) = lower(btrim(p_name))) THEN
    RAISE EXCEPTION 'ALREADY_EXISTS';
  END IF;
  INSERT INTO public.venue_suggestions (user_id, name, area, why)
    VALUES (v, btrim(p_name), nullif(btrim(coalesce(p_area,'')), ''), nullif(btrim(coalesce(p_why,'')), ''))
    RETURNING id INTO nid;
  RETURN json_build_object('ok', true, 'id', nid);
END;$$;

CREATE OR REPLACE FUNCTION public.my_venue_suggestions()
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT id, name, area, status, created_at FROM public.venue_suggestions
    WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 10
  ) t;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_suggestions()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
    SELECT s.id, s.name, s.area, s.why, s.status, s.created_at,
           p.display_name AS suggested_by
    FROM public.venue_suggestions s
    LEFT JOIN public.profiles p ON p.user_id = s.user_id
    WHERE s.status = 'pending'
    ORDER BY s.created_at ASC
  ) t), '[]'::json);
END;$$;

CREATE OR REPLACE FUNCTION public.admin_decide_suggestion(
  p_id uuid, p_approve boolean,
  p_type text DEFAULT 'gallery', p_neighborhood text DEFAULT NULL, p_emoji text DEFAULT '✨',
  p_lat numeric DEFAULT NULL, p_lng numeric DEFAULT NULL,
  p_min_level int DEFAULT 2, p_rep_mult numeric DEFAULT 2, p_radius int DEFAULT 150)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; vid uuid; sname text;
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO s FROM public.venue_suggestions WHERE id = p_id AND status = 'pending';
  IF s.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT p_approve THEN
    UPDATE public.venue_suggestions SET status = 'rejected', decided_at = now() WHERE id = p_id;
    RETURN json_build_object('ok', true, 'approved', false);
  END IF;
  SELECT display_name INTO sname FROM public.profiles WHERE user_id = s.user_id;
  INSERT INTO public.venues (name, slug, type, neighborhood, emoji, latitude, longitude,
                             geofence_radius_m, is_partner, is_hidden, min_level, rep_multiplier,
                             discovered_by, discovered_by_name)
    VALUES (s.name, regexp_replace(lower(s.name), '[^a-z0-9]+', '-', 'g'),
            coalesce(nullif(btrim(p_type), ''), 'gallery'),
            nullif(btrim(coalesce(p_neighborhood, s.area, '')), ''),
            coalesce(nullif(btrim(coalesce(p_emoji, '')), ''), '✨'),
            p_lat, p_lng, GREATEST(coalesce(p_radius, 150), 50), false, true,
            GREATEST(coalesce(p_min_level, 2), 0), GREATEST(coalesce(p_rep_mult, 2), 1),
            s.user_id, sname)
    RETURNING id INTO vid;
  UPDATE public.venue_suggestions SET status = 'approved', decided_at = now(), venue_id = vid WHERE id = p_id;
  RETURN json_build_object('ok', true, 'approved', true, 'venue_id', vid);
END;$$;

-- 5 · founder ručno (za postojeća mesta, bez UI za sada)
CREATE OR REPLACE FUNCTION public.admin_set_hidden(p_id uuid, p_hidden boolean, p_min_level int, p_rep_mult numeric)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.venues SET is_hidden = p_hidden,
    min_level = GREATEST(coalesce(p_min_level, 0), 0),
    rep_multiplier = GREATEST(coalesce(p_rep_mult, 1), 1)
    WHERE id = p_id;
  RETURN json_build_object('ok', true);
END;$$;

GRANT EXECUTE ON FUNCTION public.suggest_venue(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_venue_suggestions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_suggestions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_decide_suggestion(uuid, boolean, text, text, text, numeric, numeric, int, numeric, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_hidden(uuid, boolean, int, numeric) TO authenticated;
