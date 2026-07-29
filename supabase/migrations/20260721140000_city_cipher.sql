-- M3 GRADSKA ŠIFRA (HANDOFF-GAMIFIKACIJA §M3): Wordle × ARG preko grada.
-- Jedna zagonetka po noći; fragmenti (reči) razbacani po mestima. Sastavlja je
-- samo onaj ko se KREĆE — ili ekipa koja se podelila po gradu (crew pooling).
-- Kill-switch: app_settings.cipher_enabled.

-- Normalizacija fraze: mala slova, bez naših dijakritika, bez viška razmaka.
CREATE OR REPLACE FUNCTION public._norm(t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
           translate(lower(coalesce(t,'')), 'šđčćžŠĐČĆŽ', 'sdcczsdccz'),
           '[^a-z0-9]+', ' ', 'g')
$$;

CREATE TABLE IF NOT EXISTS public.city_ciphers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  night date NOT NULL UNIQUE,
  phrase text NOT NULL,
  phrase_norm text NOT NULL,
  fragments jsonb NOT NULL,          -- [{venue_id, word}] · 3–5 komada
  reward_afc int NOT NULL DEFAULT 150,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','done')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.cipher_completions (
  cipher_id uuid NOT NULL REFERENCES public.city_ciphers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  PRIMARY KEY (cipher_id, user_id)
);
ALTER TABLE public.city_ciphers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cipher_completions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_settings (key, value) VALUES ('cipher_enabled', 'true')
  ON CONFLICT (key) DO NOTHING;

-- Moji fragmenti = reči sa mesta gde smo BILI (ja ili moja ekipa te noći).
CREATE OR REPLACE FUNCTION public.cipher_status()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); c record; on_flag boolean; done boolean; collected json; total int;
BEGIN
  SELECT (value = 'true') INTO on_flag FROM public.app_settings WHERE key = 'cipher_enabled';
  IF v IS NULL OR NOT COALESCE(on_flag, false) THEN RETURN json_build_object('active', false); END IF;

  SELECT * INTO c FROM public.city_ciphers
   WHERE status = 'live' AND night = public.nightlife_date_of(now());
  IF c.id IS NULL THEN RETURN json_build_object('active', false); END IF;

  total := jsonb_array_length(c.fragments);
  SELECT EXISTS (SELECT 1 FROM public.cipher_completions
                  WHERE cipher_id = c.id AND user_id = v AND completed_at IS NOT NULL) INTO done;

  WITH my_crew AS (            -- ekipa te noći (crew pooling — poenta mehanike)
    SELECT DISTINCT cm2.user_id
      FROM public.crew_members cm1
      JOIN public.crews cr ON cr.id = cm1.crew_id AND cr.night = c.night
      JOIN public.crew_members cm2 ON cm2.crew_id = cm1.crew_id
     WHERE cm1.user_id = v
  ),
  seen AS (                    -- mesta koja smo pokrili te noći
    SELECT DISTINCT vc.venue_id
      FROM public.venue_checkins vc
     WHERE public.nightlife_date_of(vc.created_at) = c.night
       AND (vc.user_id = v OR vc.user_id IN (SELECT user_id FROM my_crew))
  )
  SELECT COALESCE(json_agg(json_build_object('word', f->>'word', 'venue_name', vn.name)), '[]'::json)
    INTO collected
    FROM jsonb_array_elements(c.fragments) f
    JOIN seen s ON s.venue_id = (f->>'venue_id')::uuid
    LEFT JOIN public.venues vn ON vn.id = (f->>'venue_id')::uuid;

  RETURN json_build_object(
    'active', true, 'cipher_id', c.id, 'total', total,
    'collected', collected, 'collected_count', json_array_length(collected),
    'completed', done, 'reward_afc', c.reward_afc
  );
END;$$;

-- Predaja fraze: traži ≥1 SOPSTVENI check-in te noći (ne može se rešiti tuđim
-- nogama), max 10 pokušaja po noći, nagrada jednom.
CREATE OR REPLACE FUNCTION public.cipher_submit(p_phrase text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); c record; att int; v_bal int; on_flag boolean;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT (value = 'true') INTO on_flag FROM public.app_settings WHERE key = 'cipher_enabled';
  IF NOT COALESCE(on_flag, false) THEN RAISE EXCEPTION 'DISABLED'; END IF;

  SELECT * INTO c FROM public.city_ciphers
   WHERE status = 'live' AND night = public.nightlife_date_of(now());
  IF c.id IS NULL THEN RAISE EXCEPTION 'NO_CIPHER'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.venue_checkins vc
                  WHERE vc.user_id = v AND public.nightlife_date_of(vc.created_at) = c.night)
  THEN RAISE EXCEPTION 'CHECKIN_REQUIRED'; END IF;

  INSERT INTO public.cipher_completions (cipher_id, user_id, attempts)
    VALUES (c.id, v, 0) ON CONFLICT (cipher_id, user_id) DO NOTHING;

  SELECT attempts INTO att FROM public.cipher_completions WHERE cipher_id = c.id AND user_id = v;
  IF EXISTS (SELECT 1 FROM public.cipher_completions
              WHERE cipher_id = c.id AND user_id = v AND completed_at IS NOT NULL)
  THEN RAISE EXCEPTION 'ALREADY'; END IF;
  IF att >= 10 THEN RAISE EXCEPTION 'TOO_MANY'; END IF;

  UPDATE public.cipher_completions SET attempts = attempts + 1
   WHERE cipher_id = c.id AND user_id = v;

  IF public._norm(p_phrase) <> c.phrase_norm THEN
    RETURN json_build_object('ok', false, 'attempts_left', 10 - (att + 1));
  END IF;

  UPDATE public.cipher_completions SET completed_at = now()
   WHERE cipher_id = c.id AND user_id = v;

  SELECT COALESCE(spendable_xp, 0) INTO v_bal FROM public.profiles WHERE user_id = v;
  INSERT INTO public.afc_ledger (user_id, delta, reason, ref_type, ref_id, balance_after)
    VALUES (v, c.reward_afc, 'cipher', 'cipher', c.id, v_bal + c.reward_afc);
  UPDATE public.profiles SET spendable_xp = v_bal + c.reward_afc WHERE user_id = v;

  RETURN json_build_object('ok', true, 'phrase', c.phrase, 'afc', c.reward_afc);
END;$$;

CREATE OR REPLACE FUNCTION public.create_cipher(
  p_night date, p_phrase text, p_fragments jsonb, p_reward int DEFAULT 150, p_live boolean DEFAULT true)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nid uuid; n int;
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF jsonb_typeof(p_fragments) <> 'array' THEN RAISE EXCEPTION 'BAD_FRAGMENTS'; END IF;
  n := jsonb_array_length(p_fragments);
  IF n < 3 OR n > 5 THEN RAISE EXCEPTION 'FRAGMENTS_COUNT'; END IF;
  INSERT INTO public.city_ciphers (night, phrase, phrase_norm, fragments, reward_afc, status)
    VALUES (p_night, trim(p_phrase), public._norm(p_phrase), p_fragments, COALESCE(p_reward,150),
            CASE WHEN p_live THEN 'live' ELSE 'draft' END)
    ON CONFLICT (night) DO UPDATE SET phrase = EXCLUDED.phrase, phrase_norm = EXCLUDED.phrase_norm,
      fragments = EXCLUDED.fragments, reward_afc = EXCLUDED.reward_afc, status = EXCLUDED.status
    RETURNING id INTO nid;
  RETURN json_build_object('ok', true, 'id', nid, 'fragments', n);
END;$$;
