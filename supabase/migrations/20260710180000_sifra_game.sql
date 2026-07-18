-- ============================================================
-- ŠIFRA — igra velikih (founder 2026-07-13). Opt-in po večeri, mečovanje
-- SAMO među čekiranima iste noći u istom mestu (Z2 co-presence), identitet
-- tek posle OBOSTRANE potvrde (Z4). Algoritam = prefs overlap (pošteno ime,
-- ne "AI"). Sve iza SECURITY DEFINER RPC-jeva, tabele deny-all.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dare_pool (
  user_id uuid NOT NULL,
  night date NOT NULL,
  venue_id uuid NOT NULL,
  venue_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, night)
);
ALTER TABLE public.dare_pool ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.dare_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  night date NOT NULL,
  venue_id uuid NOT NULL,
  venue_name text NOT NULL,
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  mission text NOT NULL,
  code_a text NOT NULL,
  code_b text NOT NULL,
  a_confirmed boolean NOT NULL DEFAULT false,
  b_confirmed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dare_pairs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_dare_pairs_night ON public.dare_pairs (night, user_a, user_b);

-- Ulazak u igru: gate = check-in VEČERAS; venue iz poslednjeg check-ina.
CREATE OR REPLACE FUNCTION public.dare_join()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_night date := public.nightlife_date_of(now());
  v_vid uuid; v_vname text;
  v_cand uuid; v_pair uuid;
  v_my_prefs text[]; 
  v_codes text[][] := ARRAY[
    ARRAY['PONOĆ NEMA','KROV'], ARRAY['BAS ZNA','MOJE IME'], ARRAY['SVITANJE JE','DOGOVOR'],
    ARRAY['GRAD SPAVA','MI NE'], ARRAY['TIŠINA PRE','BURE'], ARRAY['NOĆ TE','ČEKA'],
    ARRAY['PODIJUM JE','SVEDOK'], ARRAY['KAMERA TEK','NA AFTERU'], ARRAY['EKIPA SE','SAMA SLOŽI'],
    ARRAY['ISKRA PRE','IMENA'], ARRAY['RITAM JE','MATERNJI'], ARRAY['NIKO NE ZNA','ZA SUTRA']
  ];
  v_pick int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- već u paru večeras?
  SELECT id INTO v_pair FROM public.dare_pairs
   WHERE night = v_night AND (user_a = v_user OR user_b = v_user) LIMIT 1;
  IF v_pair IS NOT NULL THEN RETURN json_build_object('status','matched'); END IF;

  -- poslednji check-in VEČERAS = moje mesto
  SELECT vc.venue_id, v.name INTO v_vid, v_vname
    FROM public.venue_checkins vc JOIN public.venues v ON v.id = vc.venue_id
   WHERE vc.user_id = v_user AND public.nightlife_date_of(vc.created_at) = v_night
   ORDER BY vc.created_at DESC LIMIT 1;
  IF v_vid IS NULL THEN RETURN json_build_object('status','no_checkin'); END IF;

  INSERT INTO public.dare_pool (user_id, night, venue_id, venue_name)
  VALUES (v_user, v_night, v_vid, v_vname)
  ON CONFLICT (user_id, night) DO UPDATE SET venue_id = EXCLUDED.venue_id, venue_name = EXCLUDED.venue_name;

  -- kandidat: isti venue+noć, nije ja, nije već u paru — najveći prefs overlap
  SELECT music_preferences INTO v_my_prefs FROM public.profiles WHERE user_id = v_user;
  SELECT p.user_id INTO v_cand
    FROM public.dare_pool p
    JOIN public.profiles pr ON pr.user_id = p.user_id
   WHERE p.night = v_night AND p.venue_id = v_vid AND p.user_id <> v_user
     AND NOT EXISTS (SELECT 1 FROM public.dare_pairs dp WHERE dp.night = v_night AND (dp.user_a = p.user_id OR dp.user_b = p.user_id))
   ORDER BY coalesce((SELECT count(*) FROM unnest(pr.music_preferences) g WHERE g = ANY(coalesce(v_my_prefs, ARRAY[]::text[]))), 0) DESC,
            random()
   LIMIT 1;

  IF v_cand IS NULL THEN RETURN json_build_object('status','waiting'); END IF;

  v_pick := 1 + floor(random() * array_length(v_codes, 1))::int;
  INSERT INTO public.dare_pairs (night, venue_id, venue_name, user_a, user_b, mission, code_a, code_b)
  VALUES (v_night, v_vid, v_vname, v_user, v_cand,
          'Chill zona. Nađi svoju polovinu — priđi i izgovori svoj deo šifre.',
          v_codes[v_pick][1], v_codes[v_pick][2]);
  RETURN json_build_object('status','matched');
END; $$;

-- Moje stanje večeras (identitet druge strane TEK kad oboje potvrde).
CREATE OR REPLACE FUNCTION public.dare_status()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_night date := public.nightlife_date_of(now());
  r record; v_me_a boolean; v_other uuid; v_other_name text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO r FROM public.dare_pairs
   WHERE night = v_night AND (user_a = v_user OR user_b = v_user) LIMIT 1;
  IF r.id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.dare_pool WHERE user_id = v_user AND night = v_night) THEN
      RETURN json_build_object('status','waiting');
    END IF;
    RETURN json_build_object('status','idle');
  END IF;
  v_me_a := (r.user_a = v_user);
  v_other := CASE WHEN v_me_a THEN r.user_b ELSE r.user_a END;
  IF r.a_confirmed AND r.b_confirmed THEN
    SELECT display_name INTO v_other_name FROM public.profiles WHERE user_id = v_other;
  END IF;
  RETURN json_build_object(
    'status','matched', 'pair_id', r.id, 'venue', r.venue_name, 'mission', r.mission,
    'my_code', CASE WHEN v_me_a THEN r.code_a ELSE r.code_b END,
    'me_confirmed', CASE WHEN v_me_a THEN r.a_confirmed ELSE r.b_confirmed END,
    'other_confirmed', CASE WHEN v_me_a THEN r.b_confirmed ELSE r.a_confirmed END,
    'completed', (r.a_confirmed AND r.b_confirmed),
    'other_name', v_other_name
  );
END; $$;

-- Potvrda susreta (obe strane → completed).
CREATE OR REPLACE FUNCTION public.dare_confirm(p_pair uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  r record;
BEGIN
  SELECT * INTO r FROM public.dare_pairs WHERE id = p_pair AND (user_a = v_user OR user_b = v_user);
  IF r.id IS NULL THEN RAISE EXCEPTION 'Nije tvoj par'; END IF;
  IF r.user_a = v_user THEN UPDATE public.dare_pairs SET a_confirmed = true WHERE id = p_pair;
  ELSE UPDATE public.dare_pairs SET b_confirmed = true WHERE id = p_pair; END IF;
  SELECT * INTO r FROM public.dare_pairs WHERE id = p_pair;
  IF r.a_confirmed AND r.b_confirmed AND r.completed_at IS NULL THEN
    UPDATE public.dare_pairs SET completed_at = now() WHERE id = p_pair;
  END IF;
  RETURN json_build_object('completed', r.a_confirmed AND r.b_confirmed);
END; $$;

-- Izlaz iz igre (samo dok nisi uparen).
CREATE OR REPLACE FUNCTION public.dare_leave()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.dare_pool WHERE user_id = auth.uid() AND night = public.nightlife_date_of(now())
    AND NOT EXISTS (SELECT 1 FROM public.dare_pairs WHERE night = public.nightlife_date_of(now()) AND (user_a = auth.uid() OR user_b = auth.uid()));
END; $$;

GRANT EXECUTE ON FUNCTION public.dare_join() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dare_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dare_confirm(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dare_leave() TO authenticated;
