-- M2 KONVERGENCIJA (HANDOFF-GAMIFIKACIJA §M2, doktrina TELO JE KONTROLER):
-- vremenski drop na MESTU — nagradu dobija ko fizički dođe i čekira se.
-- Ne može se odigrati sa kauča: claim traži check-in ≤12h na TOM venue.
-- Kill-switch: app_settings.convergence_enabled (B1 flag).

CREATE TABLE IF NOT EXISTS public.convergence_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  title text NOT NULL,
  reward_label text NOT NULL,
  afc_bonus int NOT NULL DEFAULT 50,
  capacity int NOT NULL CHECK (capacity > 0),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','done','cancelled')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.convergence_claims (
  drop_id uuid NOT NULL REFERENCES public.convergence_drops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (drop_id, user_id)
);
ALTER TABLE public.convergence_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convergence_claims ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_settings (key, value) VALUES ('convergence_enabled', 'true')
  ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_convergences()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); on_flag boolean;
BEGIN
  SELECT (value = 'true') INTO on_flag FROM public.app_settings WHERE key = 'convergence_enabled';
  IF NOT COALESCE(on_flag, false) THEN RETURN '[]'::json; END IF;
  RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
    SELECT d.id, d.title, d.reward_label, d.afc_bonus, d.capacity, d.starts_at, d.ends_at, d.status,
           d.venue_id, vn.name AS venue_name,
           (SELECT count(*) FROM public.convergence_claims c WHERE c.drop_id = d.id)::int AS claimed,
           EXISTS (SELECT 1 FROM public.convergence_claims c WHERE c.drop_id = d.id AND c.user_id = v) AS my_claimed,
           (now() >= d.starts_at AND now() <= d.ends_at AND d.status <> 'cancelled') AS is_live
    FROM public.convergence_drops d
    JOIN public.venues vn ON vn.id = d.venue_id
    WHERE d.status <> 'cancelled' AND d.ends_at > now() - interval '2 hours'
    ORDER BY d.starts_at ASC
    LIMIT 10
  ) t), '[]'::json);
END;$$;

-- Gate lanac: flag → live → kapacitet → check-in na TOM mestu → nije već uzeo.
-- Kapacitet se broji unutar transakcije (race-safe pod row lockom na drop).
CREATE OR REPLACE FUNCTION public.claim_convergence(p_drop uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); d record; taken int; v_bal int; on_flag boolean;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT (value = 'true') INTO on_flag FROM public.app_settings WHERE key = 'convergence_enabled';
  IF NOT COALESCE(on_flag, false) THEN RAISE EXCEPTION 'DISABLED'; END IF;

  SELECT * INTO d FROM public.convergence_drops WHERE id = p_drop FOR UPDATE;
  IF d.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF d.status = 'cancelled' OR now() < d.starts_at OR now() > d.ends_at THEN RAISE EXCEPTION 'DROP_NOT_LIVE'; END IF;

  IF EXISTS (SELECT 1 FROM public.convergence_claims WHERE drop_id = p_drop AND user_id = v) THEN
    RAISE EXCEPTION 'ALREADY';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.venue_checkins vc
    WHERE vc.user_id = v AND vc.venue_id = d.venue_id AND vc.created_at > now() - interval '12 hours'
  ) THEN RAISE EXCEPTION 'CHECKIN_REQUIRED'; END IF;

  SELECT count(*) INTO taken FROM public.convergence_claims WHERE drop_id = p_drop;
  IF taken >= d.capacity THEN RAISE EXCEPTION 'FULL'; END IF;

  INSERT INTO public.convergence_claims (drop_id, user_id) VALUES (p_drop, v);

  SELECT COALESCE(spendable_xp, 0) INTO v_bal FROM public.profiles WHERE user_id = v;
  INSERT INTO public.afc_ledger (user_id, delta, reason, ref_type, ref_id, balance_after)
    VALUES (v, d.afc_bonus, 'convergence', 'convergence', p_drop, v_bal + d.afc_bonus);
  UPDATE public.profiles SET spendable_xp = v_bal + d.afc_bonus WHERE user_id = v;

  RETURN json_build_object('ok', true, 'position', taken + 1, 'capacity', d.capacity,
                           'reward', d.reward_label, 'afc', d.afc_bonus);
END;$$;

CREATE OR REPLACE FUNCTION public.create_convergence(
  p_venue uuid, p_title text, p_reward text, p_capacity int,
  p_starts timestamptz, p_ends timestamptz, p_afc int DEFAULT 50)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nid uuid;
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_ends <= p_starts THEN RAISE EXCEPTION 'BAD_WINDOW'; END IF;
  INSERT INTO public.convergence_drops (venue_id, title, reward_label, capacity, starts_at, ends_at, afc_bonus, created_by, status)
    VALUES (p_venue, trim(p_title), trim(p_reward), p_capacity, p_starts, p_ends, COALESCE(p_afc, 50), auth.uid(), 'scheduled')
    RETURNING id INTO nid;
  RETURN json_build_object('ok', true, 'id', nid);
END;$$;

CREATE OR REPLACE FUNCTION public.cancel_convergence(p_drop uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.convergence_drops SET status = 'cancelled' WHERE id = p_drop;
  RETURN json_build_object('ok', true);
END;$$;
