-- WEEKEND ROADMAP v0 (QUEST §6 kanonska petlja, war_task NK·Contributor):
-- QUESTS pravi → founder validira (nagrada POSLE prihvatanja, §10.7) →
-- HOME distribuira → PROFILE/reputacija kasnije (saves = mera korisnosti).
-- RLS deny-all + SECURITY DEFINER RPC šablon kao ostatak baze.

CREATE TABLE IF NOT EXISTS public.roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  day text NOT NULL CHECK (day IN ('PET','SUB','NED')),
  why text,
  stops jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.roadmap_saves (
  roadmap_id uuid NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (roadmap_id, user_id)
);
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_saves ENABLE ROW LEVEL SECURITY;

-- Predaja rute: 3–5 stanica, max 2 pending po korisniku (anti-spam §10.7).
CREATE OR REPLACE FUNCTION public.submit_roadmap(p_title text, p_day text, p_why text, p_stops jsonb)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); n int; s jsonb; rid uuid;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(trim(coalesce(p_title,''))) < 3 THEN RAISE EXCEPTION 'TITLE_SHORT'; END IF;
  IF p_day NOT IN ('PET','SUB','NED') THEN RAISE EXCEPTION 'BAD_DAY'; END IF;
  IF jsonb_typeof(p_stops) <> 'array' THEN RAISE EXCEPTION 'BAD_STOPS'; END IF;
  n := jsonb_array_length(p_stops);
  IF n < 3 OR n > 5 THEN RAISE EXCEPTION 'STOPS_COUNT'; END IF;
  FOR s IN SELECT * FROM jsonb_array_elements(p_stops) LOOP
    IF length(trim(coalesce(s->>'venue',''))) < 2 OR length(trim(coalesce(s->>'time',''))) < 4 THEN
      RAISE EXCEPTION 'STOP_INCOMPLETE';
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM public.roadmaps WHERE user_id = v AND status = 'pending') >= 2 THEN
    RAISE EXCEPTION 'PENDING_LIMIT';
  END IF;
  INSERT INTO public.roadmaps (user_id, title, day, why, stops)
    VALUES (v, trim(p_title), p_day, nullif(trim(coalesce(p_why,'')),''), p_stops)
    RETURNING id INTO rid;
  RETURN json_build_object('ok', true, 'id', rid, 'status', 'pending');
END;$$;

-- Liste: odobrene za sve (+ moje pending), founder vidi i tuđe pending za moderaciju.
CREATE OR REPLACE FUNCTION public.get_roadmaps()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); fed boolean := public._is_founder();
BEGIN
  RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
    SELECT r.id, r.title, r.day, r.why, r.stops, r.status, r.created_at,
           COALESCE(pr.display_name, 'raver') AS author,
           r.user_id = v AS mine,
           (SELECT count(*) FROM public.roadmap_saves rs WHERE rs.roadmap_id = r.id)::int AS saves,
           EXISTS (SELECT 1 FROM public.roadmap_saves rs WHERE rs.roadmap_id = r.id AND rs.user_id = v) AS my_saved
    FROM public.roadmaps r
    LEFT JOIN public.profiles pr ON pr.user_id = r.user_id
    WHERE r.created_at > now() - interval '30 days'
      AND (r.status = 'approved' OR r.user_id = v OR fed)
      AND r.status <> 'rejected'
    ORDER BY (r.status = 'pending') DESC, r.created_at DESC
    LIMIT 20
  ) t), '[]'::json);
END;$$;

CREATE OR REPLACE FUNCTION public.toggle_roadmap_save(p_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); existed boolean;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.roadmaps WHERE id = p_id AND status = 'approved') THEN
    RAISE EXCEPTION 'NOT_APPROVED';
  END IF;
  DELETE FROM public.roadmap_saves WHERE roadmap_id = p_id AND user_id = v RETURNING true INTO existed;
  IF existed IS NULL THEN
    INSERT INTO public.roadmap_saves (roadmap_id, user_id) VALUES (p_id, v);
    RETURN json_build_object('saved', true);
  END IF;
  RETURN json_build_object('saved', false);
END;$$;

-- Founder moderacija; nagrada POSLE prihvatanja: +100 AFC autoru (jednom).
CREATE OR REPLACE FUNCTION public.moderate_roadmap(p_id uuid, p_status text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_bal int;
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'BAD_STATUS'; END IF;
  SELECT * INTO r FROM public.roadmaps WHERE id = p_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF r.status = 'pending' AND p_status = 'approved' THEN
    SELECT COALESCE(spendable_xp,0) INTO v_bal FROM public.profiles WHERE user_id = r.user_id;
    INSERT INTO public.afc_ledger (user_id, delta, reason, ref_type, ref_id, balance_after)
      VALUES (r.user_id, 100, 'roadmap', 'roadmap', r.id, v_bal + 100);
    UPDATE public.profiles SET spendable_xp = v_bal + 100 WHERE user_id = r.user_id;
  END IF;
  UPDATE public.roadmaps SET status = p_status WHERE id = p_id;
  RETURN json_build_object('ok', true, 'id', p_id, 'status', p_status);
END;$$;
