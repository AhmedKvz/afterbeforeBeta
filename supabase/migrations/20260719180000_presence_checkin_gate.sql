-- SECTION-LOCKS §10.2 (weekday Active + Iskra) — zatvaranje remote-browse rupe.
-- Pre: set_venue_presence(visible=true) NIJE tražio check-in → bilo ko je mogao
-- daljinski da se proglasi vidljivim na bilo kom mestu i lista ljude tamo
-- (get_venue_presence vraća people[] čim je me_visible). To je tačno ono što
-- lock zabranjuje: "no unlimited remote browsing of people".
-- Posle: VISIBLE zahteva verifikovan check-in na TOM mestu u zadnjih 12h
-- (isti prozor kao both_at_venue za iskru). GHOST (visible=false) ostaje
-- slobodan — gašenje vidljivosti se nikad ne uslovljava.
-- Napomena (potvrđeno postojeće, ne menja se): Active ionako ISTIČE sam —
-- get_venue_presence čita samo redove sa last_seen < 3h; iskra limit 3/noć
-- već enforcovan u send_spark.
CREATE OR REPLACE FUNCTION public.set_venue_presence(p_venue text, p_visible boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v UUID := auth.uid();
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF COALESCE(p_visible, false) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.venue_checkins vc
      JOIN public.venues vn ON vn.id = vc.venue_id
      WHERE vc.user_id = v AND vn.name = p_venue
        AND vc.created_at > now() - interval '12 hours'
    ) THEN
      RAISE EXCEPTION 'CHECKIN_REQUIRED';
    END IF;
  END IF;

  INSERT INTO public.venue_presence (user_id, venue_name, visible, last_seen)
  VALUES (v, p_venue, COALESCE(p_visible, false), now())
  ON CONFLICT (user_id) DO UPDATE SET venue_name = EXCLUDED.venue_name, visible = EXCLUDED.visible, last_seen = now();
  RETURN json_build_object('venue', p_venue, 'visible', COALESCE(p_visible, false));
END;$function$;
