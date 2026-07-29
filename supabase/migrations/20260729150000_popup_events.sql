-- POP-UP EVENTI (QUEST-DOKTRINA §6, poslednji kod-item): događaj koji nije
-- vezan za stalno mesto na mapi — žurka u napuštenoj hali, rejv na keju,
-- piknik-okupljanje. Model: EFEMERALNI VENUE (type='popup', active_until) —
-- time check-in, prisustvo, konvergencija, šifra i IRL streak rade BEZ novih
-- putanja. Istekao pop-up nestaje iz imenika (klijent) i odbija check-in
-- (server, parsabilno POPUP_ENDED).

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS active_until timestamptz;

-- check-in: istekao pop-up ne prima nikoga (prepis, dodat active_until gate)
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
  v_until TIMESTAMPTZ;
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
         COALESCE(min_level, 0), COALESCE(rep_multiplier, 1), COALESCE(is_hidden, false), active_until
    INTO v_vlat, v_vlon, v_radius, v_minlevel, v_repmult, v_hidden, v_until
    FROM public.venues WHERE id = p_venue;
  IF v_vlat IS NULL THEN RAISE EXCEPTION 'Venue not found or missing coordinates'; END IF;

  -- POP-UP gate: posle isteka nema check-ina (pošten broj — žurka je gotova)
  IF v_until IS NOT NULL AND v_now > v_until THEN
    RAISE EXCEPTION 'POPUP_ENDED';
  END IF;

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

  -- Nightlife prozor: skrivena dnevna mesta I pop-up eventi su izuzeti —
  -- pop-up ima SOPSTVENI prozor (active_until), klupski mu ne treba.
  IF NOT (v_hour >= 20 OR v_hour < 6) THEN
    v_flags := array_append(v_flags, 'outside_nightlife');
    IF v_night_enforced AND NOT v_hidden AND v_until IS NULL THEN
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

-- founder: kreiranje i gašenje pop-upa
CREATE OR REPLACE FUNCTION public.admin_create_popup(
  p_name text, p_neighborhood text, p_emoji text,
  p_lat numeric, p_lng numeric, p_until timestamptz,
  p_radius int DEFAULT 150, p_hidden boolean DEFAULT false,
  p_min_level int DEFAULT 0, p_rep_mult numeric DEFAULT 1.5)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nid uuid;
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF coalesce(btrim(p_name), '') = '' THEN RAISE EXCEPTION 'NAME_REQUIRED'; END IF;
  IF p_lat IS NULL OR p_lng IS NULL THEN RAISE EXCEPTION 'COORDS_REQUIRED'; END IF;
  IF p_until IS NULL OR p_until <= now() THEN RAISE EXCEPTION 'BAD_WINDOW'; END IF;
  INSERT INTO public.venues (name, slug, type, neighborhood, emoji, latitude, longitude,
                             geofence_radius_m, is_partner, is_hidden, min_level, rep_multiplier, active_until)
    VALUES (btrim(p_name),
            regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g') || '-' || to_char(now(), 'YYMMDD'),
            'popup', nullif(btrim(coalesce(p_neighborhood, '')), ''),
            coalesce(nullif(btrim(coalesce(p_emoji, '')), ''), '⚡'),
            p_lat, p_lng, GREATEST(coalesce(p_radius, 150), 50), false,
            coalesce(p_hidden, false), GREATEST(coalesce(p_min_level, 0), 0),
            GREATEST(coalesce(p_rep_mult, 1.5), 1), p_until)
    RETURNING id INTO nid;
  RETURN json_build_object('ok', true, 'id', nid);
END;$$;

CREATE OR REPLACE FUNCTION public.admin_end_popup(p_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.venues SET active_until = now() WHERE id = p_id AND type = 'popup';
  RETURN json_build_object('ok', true);
END;$$;

GRANT EXECUTE ON FUNCTION public.admin_create_popup(text, text, text, numeric, numeric, timestamptz, int, boolean, int, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_end_popup(uuid) TO authenticated;
