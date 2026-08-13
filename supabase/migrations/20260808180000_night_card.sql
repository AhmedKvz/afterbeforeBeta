-- ═══════════════════════════════════════════════════════════════════════════
-- PLESNA KARTICA (odluka 2026-08-08): posle noći, prvi ulazak u app dočeka
-- karticu — koliko je noć trajala, ruta, ples — i poređenje sa prijateljem
-- po imenu. Share = organski growth loop („I danced this much").
--
-- Koraci (steps): kolona postoji od danas, ali je puni SAMO native app
-- (Capacitor, pedometar upit unazad za prozor noći — grant M1–3). Web
-- nikad ne izmišlja korake (iskren-broj): NULL = ne prikazuje se.
-- Privatnost: čuvaju se zbirovi po noći, nikad kretanje.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.night_stats (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  night        date NOT NULL,
  steps        int,                          -- native-only; web NULL
  duration_min int  NOT NULL DEFAULT 0,      -- prvi→poslednji signal te noći
  dance_s      int  NOT NULL DEFAULT 0,      -- zbir dance sesija
  venues       text[] NOT NULL DEFAULT '{}', -- ruta po redu dolaska
  checkins     int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, night)
);
CREATE INDEX IF NOT EXISTS idx_night_stats_night ON public.night_stats(night);
ALTER TABLE public.night_stats ENABLE ROW LEVEL SECURITY;
-- ultra-review bug_010: `venues` je LOKACIONI podatak (ruta noći) — čitanje
-- SAMO svojih redova. compare_night je SECURITY DEFINER i projektuje samo
-- brojeve (nikad rutu), pa mu javno čitanje ne treba.
DROP POLICY IF EXISTS ns_read ON public.night_stats;
CREATE POLICY ns_read ON public.night_stats FOR SELECT USING (user_id = auth.uid());
-- upis samo kroz RPC (definer) — bez direktnog INSERT/UPDATE.

-- ── get_night_card(): kartica za POSLEDNJU ZAVRŠENU noć korisnika ──────────
-- Noć je završena kad nije današnja nightlife_date (prozor se zatvorio).
-- Računa iz check-inova + dance sesija, upiše/osveži night_stats i vrati JSON.
CREATE OR REPLACE FUNCTION public.get_night_card()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_night date;
  v_first timestamptz; v_last timestamptz;
  v_venues text[]; v_checkins int; v_dance int; v_steps int;
  v_dur int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- poslednja završena noć sa bar jednim check-inom
  SELECT nightlife_date(c.created_at) INTO v_night
  FROM public.venue_checkins c
  WHERE c.user_id = v_user AND nightlife_date(c.created_at) < nightlife_date()
  ORDER BY c.created_at DESC LIMIT 1;
  IF v_night IS NULL THEN RETURN NULL; END IF;

  SELECT min(c.created_at), max(c.created_at), count(*),
         array_agg(v.name ORDER BY c.created_at)
    INTO v_first, v_last, v_checkins, v_venues
  FROM public.venue_checkins c JOIN public.venues v ON v.id = c.venue_id
  WHERE c.user_id = v_user AND nightlife_date(c.created_at) = v_night;

  SELECT coalesce(sum(duration_s), 0) INTO v_dance
  FROM public.dance_sessions WHERE user_id = v_user AND night = v_night;

  -- trajanje: jedan check-in = bar 60 min prisustva (pošten minimum), inače span
  v_dur := greatest(60, ceil(extract(epoch FROM (v_last - v_first)) / 60)::int);

  INSERT INTO public.night_stats (user_id, night, duration_min, dance_s, venues, checkins)
  VALUES (v_user, v_night, v_dur, v_dance, v_venues, v_checkins)
  ON CONFLICT (user_id, night) DO UPDATE SET
    duration_min = EXCLUDED.duration_min, dance_s = EXCLUDED.dance_s,
    venues = EXCLUDED.venues, checkins = EXCLUDED.checkins
  RETURNING steps INTO v_steps;

  RETURN json_build_object(
    'night', v_night, 'from', to_char(v_first AT TIME ZONE 'Europe/Belgrade', 'HH24:MI'),
    'to', to_char(v_last AT TIME ZONE 'Europe/Belgrade', 'HH24:MI'),
    'duration_min', v_dur, 'dance_s', v_dance, 'venues', v_venues,
    'checkins', v_checkins, 'steps', v_steps
  );
END;$$;
GRANT EXECUTE ON FUNCTION public.get_night_card() TO authenticated;

-- ── compare_night(ime, noć): poređenje sa prijateljem po display imenu ─────
CREATE OR REPLACE FUNCTION public.compare_night(p_name text, p_night date)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_friend uuid; v_fname text;
  mine record; theirs record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT user_id, display_name INTO v_friend, v_fname FROM public.profiles
   WHERE lower(btrim(display_name)) = lower(btrim(p_name)) AND user_id <> v_user
   ORDER BY xp DESC LIMIT 1;
  IF v_friend IS NULL THEN RAISE EXCEPTION 'NO_SUCH_USER'; END IF;

  SELECT duration_min, dance_s, steps, checkins INTO mine
    FROM public.night_stats WHERE user_id = v_user AND night = p_night;
  SELECT duration_min, dance_s, steps, checkins INTO theirs
    FROM public.night_stats WHERE user_id = v_friend AND night = p_night;
  IF theirs IS NULL THEN RAISE EXCEPTION 'NO_NIGHT'; END IF;

  RETURN json_build_object(
    'friend', v_fname,
    'me',     json_build_object('duration_min', mine.duration_min, 'dance_s', mine.dance_s, 'steps', mine.steps, 'checkins', mine.checkins),
    'them',   json_build_object('duration_min', theirs.duration_min, 'dance_s', theirs.dance_s, 'steps', theirs.steps, 'checkins', theirs.checkins)
  );
END;$$;
GRANT EXECUTE ON FUNCTION public.compare_night(text, date) TO authenticated;

-- ── upsert_night_steps(noć, koraci): native (Capacitor) upisuje korake ─────
-- Plafon 60.000 (anti-nonsens); sme samo za noć u kojoj korisnik IMA check-in
-- (koraci bez potvrđenog prisustva se ne primaju — iskren-broj).
CREATE OR REPLACE FUNCTION public.upsert_night_steps(p_night date, p_steps int)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_steps IS NULL OR p_steps < 0 OR p_steps > 60000 THEN RAISE EXCEPTION 'BAD_STEPS'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.venue_checkins
                 WHERE user_id = v_user AND nightlife_date(created_at) = p_night) THEN
    RAISE EXCEPTION 'NO_NIGHT';
  END IF;
  -- ultra-review bug_001: PRAVI upsert — native sme da stigne pre nego što
  -- get_night_card materijalizuje red (inače bi koraci tiho propali uz ok:true).
  INSERT INTO public.night_stats (user_id, night, steps)
  VALUES (v_user, p_night, p_steps)
  ON CONFLICT (user_id, night) DO UPDATE SET steps = EXCLUDED.steps;
  RETURN json_build_object('ok', true);
END;$$;
GRANT EXECUTE ON FUNCTION public.upsert_night_steps(date, int) TO authenticated;
