-- GRUPE (founder 2026-08-03): „u osnovi samo neka imaju join in 6 — predžurka,
-- par, itd." Jedna mehanika umesto tri: OTVORENA GRUPA sa mestima koja se
-- popunjavaju do 6. Predžurka / par-za-par / izlazak / after su samo VRSTE
-- iste stvari. Grupni chat je postojeći crew chat.
-- Nadograđuje crews (ne pravi paralelnu strukturu).

ALTER TABLE public.crews
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'izlazak'
    CHECK (kind IN ('predzurka', 'izlazak', 'par', 'after', 'putovanje')),
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_crews_open ON public.crews(is_open, night) WHERE is_open;

/* ── napravi grupu ── */
CREATE OR REPLACE FUNCTION public.create_group(
  p_kind text, p_title text, p_note text, p_night date, p_cap int, p_venue uuid DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); on_flag boolean; nid uuid; mine int;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT (value = 'true') INTO on_flag FROM public.app_settings WHERE key = 'meet_enabled';
  IF NOT COALESCE(on_flag, false) THEN RAISE EXCEPTION 'DISABLED'; END IF;
  IF p_kind NOT IN ('predzurka','izlazak','par','after','putovanje') THEN RAISE EXCEPTION 'BAD_KIND'; END IF;
  IF coalesce(btrim(p_title), '') = '' THEN RAISE EXCEPTION 'TITLE_REQUIRED'; END IF;
  IF p_night IS NULL OR p_night < (now() AT TIME ZONE 'Europe/Belgrade')::date - 1 THEN RAISE EXCEPTION 'BAD_NIGHT'; END IF;

  -- najviše 3 otvorene grupe po čoveku (anti-spam, ne monetizacija)
  SELECT count(*) INTO mine FROM public.crews c
   WHERE c.created_by = v AND c.is_open AND c.night >= (now() AT TIME ZONE 'Europe/Belgrade')::date;
  IF mine >= 3 THEN RAISE EXCEPTION 'TOO_MANY_GROUPS'; END IF;

  INSERT INTO public.crews (event_id, venue_id, night, cap, created_by, kind, title, note, is_open)
    VALUES (NULL, p_venue, p_night, LEAST(GREATEST(COALESCE(p_cap, 6), 2), 6), v,
            p_kind, btrim(p_title), nullif(btrim(coalesce(p_note, '')), ''), true)
    RETURNING id INTO nid;
  INSERT INTO public.crew_members (crew_id, user_id) VALUES (nid, v) ON CONFLICT DO NOTHING;
  RETURN json_build_object('ok', true, 'id', nid);
END;$$;

/* ── spisak otvorenih grupa (večeras → +7 dana) ── */
CREATE OR REPLACE FUNCTION public.get_open_groups()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); on_flag boolean;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT (value = 'true') INTO on_flag FROM public.app_settings WHERE key = 'meet_enabled';
  IF NOT COALESCE(on_flag, false) THEN RETURN '[]'::json; END IF;

  RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
    SELECT c.id, c.kind, c.title, c.note, c.night, c.cap,
           (SELECT name FROM public.venues vn WHERE vn.id = c.venue_id) AS venue_name,
           (SELECT count(*) FROM public.crew_members m WHERE m.crew_id = c.id)::int AS taken,
           EXISTS (SELECT 1 FROM public.crew_members m WHERE m.crew_id = c.id AND m.user_id = v) AS im_in,
           (SELECT COALESCE(json_agg(json_build_object('user_id', p.user_id, 'name', p.display_name, 'avatar', p.avatar_url) ORDER BY m.joined_at), '[]'::json)
              FROM public.crew_members m JOIN public.profiles p ON p.user_id = m.user_id
             WHERE m.crew_id = c.id) AS members,
           -- zajedničke noći sa BILO KIM iz grupe (co-presence signal)
           (SELECT count(*) FROM (
              SELECT DISTINCT x.venue_id, public.nightlife_date_of(x.created_at) nd
              FROM public.venue_checkins x
              JOIN public.venue_checkins y
                ON y.venue_id = x.venue_id
               AND public.nightlife_date_of(y.created_at) = public.nightlife_date_of(x.created_at)
              WHERE x.user_id = v
                AND y.user_id IN (SELECT user_id FROM public.crew_members m2 WHERE m2.crew_id = c.id AND m2.user_id <> v)) z)::int AS together
    FROM public.crews c
    WHERE c.is_open
      AND c.night >= (now() AT TIME ZONE 'Europe/Belgrade')::date - 1
      AND c.night <= (now() AT TIME ZONE 'Europe/Belgrade')::date + 7
      AND NOT EXISTS (SELECT 1 FROM public.blocks b
                       WHERE (b.blocker_id = v AND b.blocked_id = c.created_by)
                          OR (b.blocker_id = c.created_by AND b.blocked_id = v))
    ORDER BY c.night ASC, together DESC, c.created_at DESC
    LIMIT 30
  ) t), '[]'::json);
END;$$;

/* ── uđi u grupu ── */
CREATE OR REPLACE FUNCTION public.join_group(p_crew uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); c record; taken int; my_name text;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO c FROM public.crews WHERE id = p_crew AND is_open FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF c.night < (now() AT TIME ZONE 'Europe/Belgrade')::date - 1 THEN RAISE EXCEPTION 'PASSED'; END IF;
  IF EXISTS (SELECT 1 FROM public.crew_members WHERE crew_id = p_crew AND user_id = v) THEN
    RETURN json_build_object('ok', true, 'already', true);
  END IF;
  SELECT count(*) INTO taken FROM public.crew_members WHERE crew_id = p_crew;
  IF taken >= c.cap THEN RAISE EXCEPTION 'FULL'; END IF;

  INSERT INTO public.crew_members (crew_id, user_id) VALUES (p_crew, v);
  SELECT display_name INTO my_name FROM public.profiles WHERE user_id = v;
  INSERT INTO public.notifications (user_id, type, title, body, data)
    SELECT m.user_id, 'match', 'Neko se pridružio ✦',
           COALESCE(my_name, 'Neko') || ' je ušao/la u „' || COALESCE(c.title, 'grupu') || '" — ' || (taken + 1) || '/' || c.cap,
           json_build_object('crew_id', p_crew)::jsonb
      FROM public.crew_members m WHERE m.crew_id = p_crew AND m.user_id <> v;
  RETURN json_build_object('ok', true, 'taken', taken + 1, 'cap', c.cap);
END;$$;

/* ── izađi (poslednji gasi grupu) ── */
CREATE OR REPLACE FUNCTION public.leave_group(p_crew uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); left_n int;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM public.crew_members WHERE crew_id = p_crew AND user_id = v;
  SELECT count(*) INTO left_n FROM public.crew_members WHERE crew_id = p_crew;
  IF left_n = 0 THEN DELETE FROM public.crews WHERE id = p_crew AND is_open; END IF;
  RETURN json_build_object('ok', true, 'left', left_n);
END;$$;

GRANT EXECUTE ON FUNCTION public.create_group(text, text, text, date, int, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_open_groups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_group(uuid) TO authenticated;
