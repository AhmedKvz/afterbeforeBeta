-- funded_by (ECONOMY §13, presuda 2026-07-21): kad partner/sponzor finansira
-- nagradu konvergencije, mora jasno da piše KO — pošteni brojevi važe i za
-- novac. NULL = kuća/AfterBefore fond. Obavezno popuniti pre prvog partnera.

ALTER TABLE public.convergence_drops ADD COLUMN IF NOT EXISTS funded_by text;

CREATE OR REPLACE FUNCTION public.get_convergences()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); on_flag boolean;
BEGIN
  SELECT (value = 'true') INTO on_flag FROM public.app_settings WHERE key = 'convergence_enabled';
  IF NOT COALESCE(on_flag, false) THEN RETURN '[]'::json; END IF;
  RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
    SELECT d.id, d.title, d.reward_label, d.afc_bonus, d.capacity, d.starts_at, d.ends_at, d.status,
           d.venue_id, d.funded_by, vn.name AS venue_name,
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

-- Stara 7-param verzija mora da padne — inače PostgREST vidi dva overload-a
-- i poziv sa named args postaje dvosmislen.
DROP FUNCTION IF EXISTS public.create_convergence(uuid, text, text, int, timestamptz, timestamptz, int);

CREATE FUNCTION public.create_convergence(
  p_venue uuid, p_title text, p_reward text, p_capacity int,
  p_starts timestamptz, p_ends timestamptz, p_afc int DEFAULT 50,
  p_funded_by text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nid uuid;
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_ends <= p_starts THEN RAISE EXCEPTION 'BAD_WINDOW'; END IF;
  INSERT INTO public.convergence_drops (venue_id, title, reward_label, capacity, starts_at, ends_at, afc_bonus, funded_by, created_by, status)
    VALUES (p_venue, trim(p_title), trim(p_reward), p_capacity, p_starts, p_ends, COALESCE(p_afc, 50), NULLIF(trim(p_funded_by), ''), auth.uid(), 'scheduled')
    RETURNING id INTO nid;
  RETURN json_build_object('ok', true, 'id', nid);
END;$$;
