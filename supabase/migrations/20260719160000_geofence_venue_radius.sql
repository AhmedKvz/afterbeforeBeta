-- #57 Geofence fix (PRE-LAUNCH dug): jedan izvor istine za radius.
-- Pre: server hardkodovao 50m, klijent čitao events.geofence_radius (fallback
-- 100) sa +120m fudge-om — tri različita praga. Sada: radius živi na VENUE,
-- server ga čita, klijent koristi ISTI broj, greška je parsabilna (TOO_FAR)
-- pa klijent može pošteno da kaže „Xm od mesta — priđi na Ym".
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS geofence_radius_m integer NOT NULL DEFAULT 100;

-- Splavovi i festivali su fizički veći + GPS uz reku šeta — širi default.
UPDATE public.venues SET geofence_radius_m = 150
  WHERE type IN ('splav', 'festival') AND geofence_radius_m = 100;

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

  -- #57: per-venue radius (floor 50m da niko ne postavi nemoguć prag)
  SELECT latitude, longitude, GREATEST(COALESCE(geofence_radius_m, 100), 50)
    INTO v_vlat, v_vlon, v_radius
    FROM public.venues WHERE id = p_venue;
  IF v_vlat IS NULL THEN RAISE EXCEPTION 'Venue not found or missing coordinates'; END IF;

  v_dist := public.haversine_m(p_lat, p_lon, v_vlat, v_vlon);
  v_hour := EXTRACT(HOUR FROM v_local)::int;
  v_min  := EXTRACT(MINUTE FROM v_local)::int;

  SELECT (value = 'true') INTO v_geo_enforced   FROM public.app_settings WHERE key = 'geofence_enforced';
  SELECT (value = 'true') INTO v_night_enforced FROM public.app_settings WHERE key = 'nightlife_enforced';
  v_geo_enforced   := COALESCE(v_geo_enforced, false);
  v_night_enforced := COALESCE(v_night_enforced, false);

  -- Cooldown: 1 per venue / 12 h
  IF EXISTS (SELECT 1 FROM public.venue_checkins
             WHERE user_id = v_user AND venue_id = p_venue AND created_at > v_now - interval '12 hours') THEN
    RAISE EXCEPTION 'Already checked in here in the last 12 hours';
  END IF;

  -- Anti-cheat: implausible speed since last check-in anywhere → spoof flag
  SELECT created_at, lat, lon INTO v_last FROM public.venue_checkins
    WHERE user_id = v_user ORDER BY created_at DESC LIMIT 1;
  IF v_last.created_at IS NOT NULL THEN
    v_speed := public.haversine_m(v_last.lat, v_last.lon, p_lat, p_lon)
               / GREATEST(EXTRACT(EPOCH FROM (v_now - v_last.created_at)), 1);
    IF v_speed > 55 THEN v_flags := array_append(v_flags, 'spoof_speed'); END IF;
  END IF;

  -- Nightlife window (20:00–06:00 local)
  IF NOT (v_hour >= 20 OR v_hour < 6) THEN
    v_flags := array_append(v_flags, 'outside_nightlife');
    IF v_night_enforced THEN RAISE EXCEPTION 'Check-in only during nightlife hours (20:00–06:00)'; END IF;
  END IF;

  -- Geofence (enforced only at launch; beta records distance but allows)
  IF v_dist > v_radius THEN
    v_flags := array_append(v_flags, 'far');
    IF v_geo_enforced THEN
      -- Parsabilan format za klijent: TOO_FAR <dist_m> <radius_m>
      RAISE EXCEPTION 'TOO_FAR % %', round(v_dist), v_radius;
    END IF;
  END IF;

  -- Early bird: arriving in the 20:00–00:30 window
  v_early := (v_hour >= 20) OR (v_hour = 0 AND v_min <= 30);

  -- Crew: distinct others checked in here in last 3 h (co-presence)
  SELECT COUNT(DISTINCT user_id) INTO v_crew FROM public.venue_checkins
    WHERE venue_id = p_venue AND user_id <> v_user AND created_at > v_now - interval '3 hours';
  v_crew := COALESCE(v_crew, 0) + 1;
  IF v_crew >= 3 THEN
    v_mult_xp := 1.5; v_mult_afc := 1.2; v_flags := array_append(v_flags, 'crew');
  END IF;

  -- Awards (XP reputation + AFC currency)
  v_xp  := floor(50 * v_mult_xp)::int;
  v_afc := floor((100 + CASE WHEN v_early THEN 50 ELSE 0 END) * v_mult_afc)::int;

  -- Atomic: XP txn + AFC ledger + profile balances/level + check-in record (single transaction)
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
