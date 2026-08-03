-- PAR ZA PAR (founder 2026-08-03): treći mod uz 1na1 i Ekipu.
-- Ti i tvoj čovek činite PAR; deck pokazuje DRUGE parove; uzajamna iskra pravi
-- grupu od 4 kroz POSTOJEĆU crew infrastrukturu (crews cap=4 + crew_messages).
-- Par se pravi samo sa nekim s kim već imaš nit (bez hladnih poziva).
-- Sve besplatno. Gate: app_settings.meet_enabled.

CREATE TABLE IF NOT EXISTS public.meet_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,                     -- pozvao
  user_b uuid NOT NULL,                     -- pozvan
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  crew_id uuid,                             -- popunjeno kad par nađe par
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_a <> user_b)
);
-- jedan aktivan par po čoveku (parcijalni unique preko oba smera)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pair_a_live ON public.meet_pairs(user_a) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_pair_b_live ON public.meet_pairs(user_b) WHERE status = 'active';
ALTER TABLE public.meet_pairs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pair_swipes (
  from_pair uuid NOT NULL REFERENCES public.meet_pairs(id) ON DELETE CASCADE,
  to_pair   uuid NOT NULL REFERENCES public.meet_pairs(id) ON DELETE CASCADE,
  liked     boolean NOT NULL,
  by_user   uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (from_pair, to_pair)
);
ALTER TABLE public.pair_swipes ENABLE ROW LEVEL SECURITY;

/* ── moj par ── */
CREATE OR REPLACE FUNCTION public.my_pair()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); r record;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT p.id, p.status, p.user_a, p.user_b, p.crew_id,
         (p.user_a = v) AS i_invited,
         o.display_name AS partner_name, o.avatar_url AS partner_avatar, o.user_id AS partner_id
    INTO r
    FROM public.meet_pairs p
    JOIN public.profiles o ON o.user_id = (CASE WHEN p.user_a = v THEN p.user_b ELSE p.user_a END)
   WHERE (p.user_a = v OR p.user_b = v)
   ORDER BY (p.status = 'active') DESC, p.created_at DESC
   LIMIT 1;
  IF r.id IS NULL THEN RETURN json_build_object('has_pair', false); END IF;
  RETURN json_build_object(
    'has_pair', true, 'id', r.id, 'status', r.status, 'i_invited', r.i_invited,
    'crew_id', r.crew_id,
    'partner', json_build_object('user_id', r.partner_id, 'name', r.partner_name, 'avatar', r.partner_avatar)
  );
END;$$;

/* ── koga mogu da pozovem: samo ljudi sa kojima već imam nit ── */
CREATE OR REPLACE FUNCTION public.pair_candidates()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid();
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
    SELECT o.user_id, o.display_name, o.avatar_url
    FROM public.conversations c
    JOIN public.profiles o ON o.user_id = (CASE WHEN c.user_a = v THEN c.user_b ELSE c.user_a END)
    WHERE (c.user_a = v OR c.user_b = v)
      AND o.display_name IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.meet_pairs mp
                       WHERE mp.status = 'active' AND (mp.user_a = o.user_id OR mp.user_b = o.user_id))
      AND NOT EXISTS (SELECT 1 FROM public.blocks b
                       WHERE (b.blocker_id = v AND b.blocked_id = o.user_id)
                          OR (b.blocker_id = o.user_id AND b.blocked_id = v))
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT 20
  ) t), '[]'::json);
END;$$;

CREATE OR REPLACE FUNCTION public.pair_invite(p_to uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); nid uuid; my_name text;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_to = v THEN RAISE EXCEPTION 'SELF'; END IF;
  IF EXISTS (SELECT 1 FROM public.meet_pairs WHERE (user_a = v OR user_b = v)) THEN
    RAISE EXCEPTION 'ALREADY_PAIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM public.meet_pairs
              WHERE status = 'active' AND (user_a = p_to OR user_b = p_to)) THEN
    RAISE EXCEPTION 'TARGET_PAIRED';
  END IF;
  -- samo neko s kim već pričam
  IF NOT EXISTS (SELECT 1 FROM public.conversations
                  WHERE user_a = LEAST(v, p_to) AND user_b = GREATEST(v, p_to)) THEN
    RAISE EXCEPTION 'NO_THREAD';
  END IF;

  INSERT INTO public.meet_pairs (user_a, user_b, status) VALUES (v, p_to, 'pending')
    RETURNING id INTO nid;
  SELECT display_name INTO my_name FROM public.profiles WHERE user_id = v;
  INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (p_to, 'match', 'Poziv za par',
            COALESCE(my_name, 'Neko') || ' te zove da budete par — tražite drugi par zajedno.',
            json_build_object('pair_id', nid, 'from', v)::jsonb);
  RETURN json_build_object('ok', true, 'id', nid);
END;$$;

CREATE OR REPLACE FUNCTION public.pair_respond(p_pair uuid, p_accept boolean)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); pr record; my_name text;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO pr FROM public.meet_pairs WHERE id = p_pair AND user_b = v AND status = 'pending';
  IF pr.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT p_accept THEN
    DELETE FROM public.meet_pairs WHERE id = p_pair;
    RETURN json_build_object('ok', true, 'accepted', false);
  END IF;
  UPDATE public.meet_pairs SET status = 'active' WHERE id = p_pair;
  SELECT display_name INTO my_name FROM public.profiles WHERE user_id = v;
  INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (pr.user_a, 'match', 'Par je spreman ✦',
            COALESCE(my_name, 'Neko') || ' je prihvatio/la — sad tražite drugi par.',
            json_build_object('pair_id', p_pair)::jsonb);
  RETURN json_build_object('ok', true, 'accepted', true);
END;$$;

CREATE OR REPLACE FUNCTION public.pair_leave()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid();
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM public.meet_pairs WHERE (user_a = v OR user_b = v);
  RETURN json_build_object('ok', true);
END;$$;

/* ── deck parova ── */
CREATE OR REPLACE FUNCTION public.get_pair_deck()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); on_flag boolean; mine uuid;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT (value = 'true') INTO on_flag FROM public.app_settings WHERE key = 'meet_enabled';
  IF NOT COALESCE(on_flag, false) THEN RAISE EXCEPTION 'DISABLED'; END IF;

  SELECT id INTO mine FROM public.meet_pairs
   WHERE status = 'active' AND (user_a = v OR user_b = v);
  IF mine IS NULL THEN RAISE EXCEPTION 'NO_PAIR'; END IF;

  RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
    SELECT
      p.id,
      json_build_object('user_id', a.user_id, 'name', a.display_name, 'avatar', a.avatar_url,
                        'genres', COALESCE(a.music_preferences, '{}')) AS person_a,
      json_build_object('user_id', b.user_id, 'name', b.display_name, 'avatar', b.avatar_url,
                        'genres', COALESCE(b.music_preferences, '{}')) AS person_b,
      -- zajedničke noći: bilo koja kombinacija naša dva × njihova dva
      (SELECT count(*) FROM (
        SELECT DISTINCT x.venue_id, public.nightlife_date_of(x.created_at) nd
        FROM public.venue_checkins x
        JOIN public.venue_checkins y
          ON y.venue_id = x.venue_id
         AND public.nightlife_date_of(y.created_at) = public.nightlife_date_of(x.created_at)
        WHERE x.user_id IN (SELECT user_a FROM public.meet_pairs WHERE id = mine
                            UNION SELECT user_b FROM public.meet_pairs WHERE id = mine)
          AND y.user_id IN (p.user_a, p.user_b)) z)::int AS together,
      (SELECT vn.name FROM (
        SELECT DISTINCT x.venue_id, public.nightlife_date_of(x.created_at) nd
        FROM public.venue_checkins x
        JOIN public.venue_checkins y
          ON y.venue_id = x.venue_id
         AND public.nightlife_date_of(y.created_at) = public.nightlife_date_of(x.created_at)
        WHERE x.user_id IN (SELECT user_a FROM public.meet_pairs WHERE id = mine
                            UNION SELECT user_b FROM public.meet_pairs WHERE id = mine)
          AND y.user_id IN (p.user_a, p.user_b)
        ORDER BY 2 DESC LIMIT 1) z2
        JOIN public.venues vn ON vn.id = z2.venue_id) AS together_venue
    FROM public.meet_pairs p
    JOIN public.profiles a ON a.user_id = p.user_a
    JOIN public.profiles b ON b.user_id = p.user_b
    WHERE p.status = 'active' AND p.id <> mine AND p.crew_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.pair_swipes s
                       WHERE s.from_pair = mine AND s.to_pair = p.id)
      AND NOT EXISTS (SELECT 1 FROM public.blocks bl
                       WHERE (bl.blocker_id = v AND bl.blocked_id IN (p.user_a, p.user_b))
                          OR (bl.blocker_id IN (p.user_a, p.user_b) AND bl.blocked_id = v))
    ORDER BY together DESC, p.created_at DESC
    LIMIT 15
  ) t), '[]'::json);
END;$$;

/* ── swipe para: uzajamno → grupa od 4 (crews cap 4) ── */
CREATE OR REPLACE FUNCTION public.pair_swipe(p_to_pair uuid, p_like boolean)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v uuid := auth.uid(); mine uuid; reciprocal boolean;
  v_crew uuid; m record; other record;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO mine FROM public.meet_pairs
   WHERE status = 'active' AND (user_a = v OR user_b = v);
  IF mine IS NULL THEN RAISE EXCEPTION 'NO_PAIR'; END IF;
  IF mine = p_to_pair THEN RAISE EXCEPTION 'SELF'; END IF;

  INSERT INTO public.pair_swipes (from_pair, to_pair, liked, by_user)
    VALUES (mine, p_to_pair, p_like, v)
    ON CONFLICT (from_pair, to_pair) DO UPDATE SET liked = EXCLUDED.liked, by_user = v, created_at = now();

  IF NOT p_like THEN RETURN json_build_object('matched', false); END IF;

  SELECT EXISTS (SELECT 1 FROM public.pair_swipes
                  WHERE from_pair = p_to_pair AND to_pair = mine AND liked) INTO reciprocal;
  IF NOT reciprocal THEN RETURN json_build_object('matched', false); END IF;

  -- grupa od 4 kroz postojeći crew (bez mesta — dogovor tek sledi)
  INSERT INTO public.crews (event_id, venue_id, night, cap, created_by)
    VALUES (NULL, NULL, public.nightlife_date_of(now()), 4, v)
    RETURNING id INTO v_crew;

  SELECT * INTO m FROM public.meet_pairs WHERE id = mine;
  SELECT * INTO other FROM public.meet_pairs WHERE id = p_to_pair;
  INSERT INTO public.crew_members (crew_id, user_id)
    VALUES (v_crew, m.user_a), (v_crew, m.user_b), (v_crew, other.user_a), (v_crew, other.user_b)
    ON CONFLICT DO NOTHING;

  UPDATE public.meet_pairs SET crew_id = v_crew WHERE id IN (mine, p_to_pair);

  INSERT INTO public.notifications (user_id, type, title, body, data)
    SELECT u, 'match', 'Par našao par ✦', 'Vas četvoro ste u istoj ekipi — dogovorite gde i kad.',
           json_build_object('crew_id', v_crew)::jsonb
      FROM unnest(ARRAY[m.user_a, m.user_b, other.user_a, other.user_b]) u
     WHERE u <> v;

  RETURN json_build_object('matched', true, 'crew_id', v_crew);
END;$$;

GRANT EXECUTE ON FUNCTION public.my_pair() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pair_candidates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pair_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pair_respond(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pair_leave() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pair_deck() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pair_swipe(uuid, boolean) TO authenticated;
