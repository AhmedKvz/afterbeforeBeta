-- ============================================================
-- Venue self-serve (founder odluka 2026-07-13): SVAKO registrovano mesto
-- (klub/kafić/bar/šta god) može samo da objavljuje događaje; profil mesta
-- dobija Instagram + cover sliku. Objava AUTOMATSKI upisuje mesto u imenik
-- (venues) ako ne postoji — join-by-name integritet očuvan jer venue_name
-- uvek dolazi iz imenika. Founder zadržava edit/delete (War Room).
-- ============================================================

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS cover_url text;

-- Nađi-ili-napravi venue red za pozivaoca (club_venue nalog).
CREATE OR REPLACE FUNCTION public._my_venue_id()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_name text; v_type text; v_hood text;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT venue_name, venue_type, neighborhood INTO v_name, v_type, v_hood
    FROM public.profiles WHERE user_id = v_user AND account_type = 'club_venue';
  IF v_name IS NULL THEN RAISE EXCEPTION 'Samo nalozi mesta mogu ovo'; END IF;

  -- 1) mesto koje je ovaj nalog klejmovao
  SELECT id INTO v_id FROM public.venues WHERE claimed_by = v_user LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  -- 2) mesto istog imena u imeniku (auto-poveži: klejm pending)
  SELECT id INTO v_id FROM public.venues WHERE lower(name) = lower(v_name) LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE public.venues SET claim_status = 'pending', claimed_by = v_user
      WHERE id = v_id AND claim_status = 'unclaimed';
    RETURN v_id;
  END IF;
  -- 3) novo mesto u imeniku (njihovo, verified=false dok founder ne potvrdi)
  INSERT INTO public.venues (name, slug, type, neighborhood, claim_status, claimed_by, verified)
  VALUES (btrim(v_name),
          regexp_replace(lower(btrim(v_name)), '[^a-z0-9]+', '-', 'g') || '-' || substr(md5(v_user::text),1,4),
          coalesce(nullif(v_type,''), 'club'), nullif(v_hood,''), 'claimed', v_user, false)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- Objava događaja od strane mesta (bilo kog registrovanog).
CREATE OR REPLACE FUNCTION public.publish_venue_event(
  p_title text, p_date date, p_start time, p_end time,
  p_genres text[], p_lineup text[], p_image_url text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_vid uuid; v_name text; v_lat numeric; v_lng numeric; v_type text; v_hood text;
  v_id uuid;
BEGIN
  IF coalesce(btrim(p_title),'') = '' THEN RAISE EXCEPTION 'Naslov je obavezan'; END IF;
  IF p_date IS NULL THEN RAISE EXCEPTION 'Datum je obavezan'; END IF;
  v_vid := public._my_venue_id();
  SELECT name, latitude, longitude, type, neighborhood INTO v_name, v_lat, v_lng, v_type, v_hood
    FROM public.venues WHERE id = v_vid;

  INSERT INTO public.events (
    title, venue_name, date, start_time, end_time, music_genres, lineup, image_url,
    latitude, longitude, geofence_radius, venue_type, neighborhood, event_type, host_id
  ) VALUES (
    btrim(p_title), v_name, p_date, coalesce(p_start,'23:00'::time), p_end,
    p_genres, p_lineup, nullif(btrim(coalesce(p_image_url,'')),''),
    v_lat, v_lng, 100, v_type, v_hood, 'club_night', v_user
  ) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- Mesto uređuje SVOJ profil: instagram, cover, koordinate.
CREATE OR REPLACE FUNCTION public.update_my_venue(
  p_instagram text, p_cover_url text, p_lat numeric, p_lng numeric
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_vid uuid := public._my_venue_id();
BEGIN
  UPDATE public.venues SET
    instagram = coalesce(nullif(btrim(coalesce(p_instagram,'')),''), instagram),
    cover_url = coalesce(nullif(btrim(coalesce(p_cover_url,'')),''), cover_url),
    latitude  = coalesce(p_lat, latitude),
    longitude = coalesce(p_lng, longitude)
  WHERE id = v_vid;
END; $$;

-- Mesto može da obriše SVOJ event (host_id).
CREATE OR REPLACE FUNCTION public.delete_my_event(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.events WHERE id = p_id AND host_id = auth.uid();
END; $$;

GRANT EXECUTE ON FUNCTION public._my_venue_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_venue_event(text, date, time, time, text[], text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_venue(text, text, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_event(uuid) TO authenticated;
