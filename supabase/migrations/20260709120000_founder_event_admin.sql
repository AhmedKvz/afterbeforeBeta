-- ============================================================
-- Founder event admin — the founder fills the weekend program himself
-- (content pipeline fix: seed events expired 2026-07-02, nobody enters new
-- ones). No scraper (IG ToS / brittle / partner risk). Server-gated writes so
-- only the founder account mutates events. Mirrors admin_save_quest pattern.
-- ============================================================

-- Event upsert (p_id NULL = create). The venue is chosen by uuid from the
-- `venues` directory; venue_name/lat/lng/type/neighborhood are copied from that
-- row so the Heat join-by-name and the check-in geofence radius map stay
-- consistent (a free-typed venue_name would silently break both).
CREATE OR REPLACE FUNCTION public.admin_save_event(
  p_id uuid,
  p_title text,
  p_venue_id uuid,
  p_date date,
  p_start time,
  p_end time,
  p_genres text[],
  p_lineup text[],
  p_image_url text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_name text;
  v_lat numeric;
  v_lng numeric;
  v_type text;
  v_hood text;
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF coalesce(btrim(p_title), '') = '' THEN RAISE EXCEPTION 'Title required'; END IF;
  IF p_venue_id IS NULL THEN RAISE EXCEPTION 'Venue required'; END IF;
  IF p_date IS NULL THEN RAISE EXCEPTION 'Date required'; END IF;

  SELECT name, latitude, longitude, type, neighborhood
    INTO v_name, v_lat, v_lng, v_type, v_hood
  FROM public.venues WHERE id = p_venue_id;
  IF v_name IS NULL THEN RAISE EXCEPTION 'Venue not found'; END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.events (
      title, venue_name, date, start_time, end_time,
      music_genres, lineup, image_url,
      latitude, longitude, geofence_radius, venue_type, neighborhood, event_type
    ) VALUES (
      p_title, v_name, p_date, coalesce(p_start, '23:00'::time), p_end,
      p_genres, p_lineup, nullif(btrim(coalesce(p_image_url, '')), ''),
      v_lat, v_lng, 100, v_type, v_hood, 'club_night'
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.events SET
      title = p_title, venue_name = v_name, date = p_date,
      start_time = coalesce(p_start, start_time), end_time = p_end,
      music_genres = p_genres, lineup = p_lineup,
      image_url = nullif(btrim(coalesce(p_image_url, '')), ''),
      latitude = v_lat, longitude = v_lng, venue_type = v_type, neighborhood = v_hood
    WHERE id = p_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Event not found'; END IF;
  END IF;

  RETURN v_id;
END;
$$;

-- Hard delete — events are content, not economy; safe to remove. UI confirms.
CREATE OR REPLACE FUNCTION public.admin_delete_event(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.events WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_event(uuid, text, uuid, date, time, time, text[], text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_event(uuid) TO authenticated;
