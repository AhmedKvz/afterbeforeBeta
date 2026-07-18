-- ============================================================
-- CREW ŠIFRA — ekipa traži ekipu (founder pravac „igra velikih", 2026-07-18).
-- Anti-klika mašina u dva čina: (1) svaki opted-in član dobija PO REČ svoje
-- polovine — ekipa se prvo sastavi uživo; (2) dve ekipe se traže po
-- rečenicama. Opt-in PO ČLANU (Z4 — niko ne pristaje u tuđe ime; ekipa u
-- pool tek sa ≥2 opted). Identiteti tek posle obe potvrde. Deny-all + RPC.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crew_dare_optins (
  user_id uuid NOT NULL,
  night date NOT NULL,
  crew_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, night)
);
ALTER TABLE public.crew_dare_optins ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.crew_dare_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  night date NOT NULL,
  venue_id uuid,
  crew_a uuid NOT NULL,
  crew_b uuid NOT NULL,
  phrase_a text NOT NULL,
  phrase_b text NOT NULL,
  a_confirmed boolean NOT NULL DEFAULT false,
  b_confirmed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crew_dare_pairs ENABLE ROW LEVEL SECURITY;

-- Ulazak: član ekipe VEČERAS + check-in večeras. Ekipa u pool sa ≥2 opted.
CREATE OR REPLACE FUNCTION public.crew_dare_join()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_night date := public.nightlife_date_of(now());
  v_crew uuid; v_vid uuid; v_opted int; v_cand uuid; v_pick int;
  v_phrases text[][] := ARRAY[
    ARRAY['GRAD NIKAD NE SPAVA','A MI SMO DOKAZ'],
    ARRAY['BAS NAS JE POZVAO','I MI SMO SE ODAZVALI'],
    ARRAY['NOĆ JE NAŠA KUĆA','A PODIJUM DNEVNA SOBA'],
    ARRAY['MI ČUVAMO RITAM','VI ČUVAJTE PRIČU'],
    ARRAY['SVITANJE NAS ZNA','PO IMENIMA'],
    ARRAY['EKIPA SE NE BIRA','EKIPA SE DESI'],
    ARRAY['DOŠLI SMO PO NOĆ','ODLAZIMO SA PRIČOM'],
    ARRAY['NIKO OD NAS','NE IDE KUĆI RANO']
  ];
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  -- moja ekipa večeras
  SELECT c.id, c.venue_id INTO v_crew, v_vid
    FROM public.crews c JOIN public.crew_members m ON m.crew_id = c.id
   WHERE m.user_id = v_user AND c.night = v_night
   ORDER BY m.joined_at DESC LIMIT 1;
  IF v_crew IS NULL THEN RETURN json_build_object('status','no_crew'); END IF;
  -- check-in gate
  IF NOT EXISTS (SELECT 1 FROM public.venue_checkins vc
                  WHERE vc.user_id = v_user AND public.nightlife_date_of(vc.created_at) = v_night) THEN
    RETURN json_build_object('status','no_checkin');
  END IF;

  INSERT INTO public.crew_dare_optins (user_id, night, crew_id) VALUES (v_user, v_night, v_crew)
  ON CONFLICT (user_id, night) DO UPDATE SET crew_id = EXCLUDED.crew_id;

  -- već uparena?
  IF EXISTS (SELECT 1 FROM public.crew_dare_pairs WHERE night = v_night AND (crew_a = v_crew OR crew_b = v_crew)) THEN
    RETURN json_build_object('status','matched');
  END IF;

  SELECT count(*) INTO v_opted FROM public.crew_dare_optins WHERE night = v_night AND crew_id = v_crew;
  IF v_opted < 2 THEN RETURN json_build_object('status','need_more','opted', v_opted); END IF;

  -- kandidat ekipa: isto veče, isti venue, ≥2 opted, nije uparena — najbliža po broju opted
  SELECT o.crew_id INTO v_cand
    FROM public.crew_dare_optins o JOIN public.crews c ON c.id = o.crew_id
   WHERE o.night = v_night AND o.crew_id <> v_crew AND c.venue_id IS NOT DISTINCT FROM v_vid
     AND NOT EXISTS (SELECT 1 FROM public.crew_dare_pairs p WHERE p.night = v_night AND (p.crew_a = o.crew_id OR p.crew_b = o.crew_id))
   GROUP BY o.crew_id
  HAVING count(*) >= 2
   ORDER BY abs(count(*) - v_opted), random() LIMIT 1;

  IF v_cand IS NULL THEN RETURN json_build_object('status','waiting'); END IF;

  v_pick := 1 + floor(random() * array_length(v_phrases, 1))::int;
  INSERT INTO public.crew_dare_pairs (night, venue_id, crew_a, crew_b, phrase_a, phrase_b)
  VALUES (v_night, v_vid, v_crew, v_cand, v_phrases[v_pick][1], v_phrases[v_pick][2]);
  RETURN json_build_object('status','matched');
END; $$;

-- Status: moje reči (raspodela po opted članovima), stanje para.
CREATE OR REPLACE FUNCTION public.crew_dare_status()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_night date := public.nightlife_date_of(now());
  v_crew uuid; r record; v_phrase text; v_my_words text := ''; v_me_a boolean;
  v_words text[]; v_members uuid[]; v_pos int; v_n int; i int;
  v_other uuid; v_other_names text;
BEGIN
  SELECT o.crew_id INTO v_crew FROM public.crew_dare_optins o WHERE o.user_id = v_user AND o.night = v_night;
  IF v_crew IS NULL THEN
    -- imam li uopšte ekipu večeras?
    IF EXISTS (SELECT 1 FROM public.crews c JOIN public.crew_members m ON m.crew_id = c.id
                WHERE m.user_id = v_user AND c.night = v_night) THEN
      RETURN json_build_object('status','idle');
    END IF;
    RETURN json_build_object('status','no_crew');
  END IF;

  SELECT * INTO r FROM public.crew_dare_pairs WHERE night = v_night AND (crew_a = v_crew OR crew_b = v_crew) LIMIT 1;
  IF r.id IS NULL THEN
    IF (SELECT count(*) FROM public.crew_dare_optins WHERE night = v_night AND crew_id = v_crew) < 2 THEN
      RETURN json_build_object('status','need_more','opted',(SELECT count(*) FROM public.crew_dare_optins WHERE night = v_night AND crew_id = v_crew));
    END IF;
    RETURN json_build_object('status','waiting');
  END IF;

  v_me_a := (r.crew_a = v_crew);
  v_phrase := CASE WHEN v_me_a THEN r.phrase_a ELSE r.phrase_b END;
  -- raspodela reči round-robin po opted članovima (redosled = vreme opt-ina)
  v_words := string_to_array(v_phrase, ' ');
  SELECT array_agg(user_id ORDER BY created_at) INTO v_members
    FROM public.crew_dare_optins WHERE night = v_night AND crew_id = v_crew;
  v_n := array_length(v_members, 1);
  v_pos := array_position(v_members, v_user);
  IF v_pos IS NOT NULL THEN
    i := v_pos;
    WHILE i <= array_length(v_words, 1) LOOP
      v_my_words := v_my_words || CASE WHEN v_my_words = '' THEN '' ELSE ' · ' END || v_words[i];
      i := i + v_n;
    END LOOP;
  END IF;

  IF r.a_confirmed AND r.b_confirmed THEN
    v_other := CASE WHEN v_me_a THEN r.crew_b ELSE r.crew_a END;
    SELECT string_agg(coalesce(p.display_name,'·'), ', ') INTO v_other_names
      FROM public.crew_members m JOIN public.profiles p ON p.user_id = m.user_id
     WHERE m.crew_id = v_other;
  END IF;

  RETURN json_build_object(
    'status','matched','pair_id', r.id,
    'my_words', v_my_words, 'word_count', array_length(v_words,1), 'crew_size', v_n,
    'me_confirmed', CASE WHEN v_me_a THEN r.a_confirmed ELSE r.b_confirmed END,
    'other_confirmed', CASE WHEN v_me_a THEN r.b_confirmed ELSE r.a_confirmed END,
    'completed', (r.a_confirmed AND r.b_confirmed),
    'other_members', v_other_names
  );
END; $$;

-- Potvrda u ime ekipe (bilo koji opted član); na obe → completed + poruka u oba crew chata.
CREATE OR REPLACE FUNCTION public.crew_dare_confirm(p_pair uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_night date := public.nightlife_date_of(now());
  v_crew uuid; r record;
BEGIN
  SELECT crew_id INTO v_crew FROM public.crew_dare_optins WHERE user_id = v_user AND night = v_night;
  SELECT * INTO r FROM public.crew_dare_pairs WHERE id = p_pair;
  IF r.id IS NULL OR v_crew IS NULL OR (r.crew_a <> v_crew AND r.crew_b <> v_crew) THEN
    RAISE EXCEPTION 'Nije tvoja igra';
  END IF;
  IF r.crew_a = v_crew THEN UPDATE public.crew_dare_pairs SET a_confirmed = true WHERE id = p_pair;
  ELSE UPDATE public.crew_dare_pairs SET b_confirmed = true WHERE id = p_pair; END IF;
  SELECT * INTO r FROM public.crew_dare_pairs WHERE id = p_pair;
  IF r.a_confirmed AND r.b_confirmed AND r.completed_at IS NULL THEN
    UPDATE public.crew_dare_pairs SET completed_at = now() WHERE id = p_pair;
    INSERT INTO public.crew_messages (crew_id, user_id, body)
    VALUES (r.crew_a, v_user, '🔐🔐 ŠIFRA SASTAVLJENA — ekipe su spojene. Večeras ste jedna scena.'),
           (r.crew_b, v_user, '🔐🔐 ŠIFRA SASTAVLJENA — ekipe su spojene. Večeras ste jedna scena.');
  END IF;
  RETURN json_build_object('completed', r.a_confirmed AND r.b_confirmed);
END; $$;

CREATE OR REPLACE FUNCTION public.crew_dare_leave()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.crew_dare_optins o WHERE o.user_id = auth.uid() AND o.night = public.nightlife_date_of(now())
    AND NOT EXISTS (SELECT 1 FROM public.crew_dare_pairs p WHERE p.night = o.night AND (p.crew_a = o.crew_id OR p.crew_b = o.crew_id));
END; $$;

GRANT EXECUTE ON FUNCTION public.crew_dare_join() TO authenticated;
GRANT EXECUTE ON FUNCTION public.crew_dare_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.crew_dare_confirm(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crew_dare_leave() TO authenticated;
