-- ============================================================
-- Founder venue admin — MESTA odvojena od DOGAĐAJA (founder 2026-07-12).
-- Imenik mesta (klubovi/barovi/splavovi/kafići/restorani/festivali) se
-- održava kroz War Room MESTA tab; eventi ostaju u DOGAĐAJI tabu.
-- Isti šablon kao admin_save_event: founder-gated SECURITY DEFINER.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_save_venue(
  p_id uuid,               -- NULL = create
  p_name text,
  p_type text,             -- club|bar|splav|cafe|restaurant|festival|gallery|afterplace
  p_neighborhood text,
  p_emoji text,
  p_lat numeric,
  p_lng numeric,
  p_partner boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF coalesce(btrim(p_name), '') = '' THEN RAISE EXCEPTION 'Name required'; END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.venues (name, slug, type, neighborhood, emoji, latitude, longitude, is_partner)
    VALUES (
      btrim(p_name),
      regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g'),
      coalesce(nullif(btrim(p_type), ''), 'club'),
      nullif(btrim(coalesce(p_neighborhood, '')), ''),
      coalesce(nullif(btrim(coalesce(p_emoji, '')), ''), '🎵'),
      p_lat, p_lng, coalesce(p_partner, false)
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.venues SET
      name = btrim(p_name),
      type = coalesce(nullif(btrim(p_type), ''), type),
      neighborhood = nullif(btrim(coalesce(p_neighborhood, '')), ''),
      emoji = coalesce(nullif(btrim(coalesce(p_emoji, '')), ''), emoji),
      latitude = p_lat, longitude = p_lng,
      is_partner = coalesce(p_partner, is_partner)
    WHERE id = p_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Venue not found'; END IF;
  END IF;
  RETURN v_id;
END;
$$;

-- Delete: dozvoli samo ako mesto nema check-inova (istorija prisustva se ne briše).
CREATE OR REPLACE FUNCTION public.admin_delete_venue(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF EXISTS (SELECT 1 FROM public.venue_checkins WHERE venue_id = p_id) THEN
    RAISE EXCEPTION 'Venue has check-in history — cannot delete';
  END IF;
  DELETE FROM public.venues WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_venue(uuid, text, text, text, text, numeric, numeric, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_venue(uuid) TO authenticated;
