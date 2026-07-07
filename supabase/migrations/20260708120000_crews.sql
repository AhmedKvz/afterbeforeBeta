-- ============================================================
-- Crews — "Nađi ekipu za večeras". Bootstraps the crew graph: if you have
-- no crew, the app forms one from people going to / checked in at the same
-- place tonight who OPT IN (opt-in group = safer than 1:1, Z4). All access
-- via SECURITY DEFINER RPCs; tables deny direct access (RLS on, no policies).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid,
  venue_id uuid,
  night date NOT NULL,
  cap int NOT NULL DEFAULT 6,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.crew_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (crew_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.crew_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crew_members_crew ON public.crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_messages_crew ON public.crew_messages(crew_id, created_at);
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public._in_crew(p_crew uuid, p_user uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.crew_members WHERE crew_id = p_crew AND user_id = p_user);
$$;

-- Join (or form) a crew for tonight, scoped to an event (preferred) or venue.
CREATE OR REPLACE FUNCTION public.join_crew(p_event uuid DEFAULT NULL, p_venue uuid DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_night date := public.nightlife_date();
  v_crew  uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF p_event IS NULL AND p_venue IS NULL THEN RAISE EXCEPTION 'Event or venue required'; END IF;

  -- already in a crew for this place tonight?
  SELECT c.id INTO v_crew FROM public.crews c
  JOIN public.crew_members m ON m.crew_id = c.id AND m.user_id = v_user
  WHERE c.night = v_night
    AND ((p_event IS NOT NULL AND c.event_id = p_event) OR (p_event IS NULL AND c.venue_id = p_venue))
  LIMIT 1;

  IF v_crew IS NULL THEN
    -- an open crew (below cap) to join?
    SELECT c.id INTO v_crew FROM public.crews c
    WHERE c.night = v_night
      AND ((p_event IS NOT NULL AND c.event_id = p_event) OR (p_event IS NULL AND c.venue_id = p_venue))
      AND (SELECT count(*) FROM public.crew_members m WHERE m.crew_id = c.id) < c.cap
    ORDER BY (SELECT count(*) FROM public.crew_members m WHERE m.crew_id = c.id) DESC
    LIMIT 1
    FOR UPDATE;

    IF v_crew IS NULL THEN
      INSERT INTO public.crews (event_id, venue_id, night, created_by)
      VALUES (p_event, p_venue, v_night, v_user) RETURNING id INTO v_crew;
    END IF;

    INSERT INTO public.crew_members (crew_id, user_id) VALUES (v_crew, v_user)
    ON CONFLICT (crew_id, user_id) DO NOTHING;
  END IF;

  RETURN json_build_object('ok', true, 'crew_id', v_crew);
END;
$$;

-- Full crew view for a member: event/venue context + members + recent messages.
CREATE OR REPLACE FUNCTION public.get_crew(p_crew uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_out json;
BEGIN
  IF v_user IS NULL OR NOT public._in_crew(p_crew, v_user) THEN RAISE EXCEPTION 'Not in this crew'; END IF;
  SELECT json_build_object(
    'crew', (SELECT json_build_object('id', c.id, 'night', c.night,
               'event', (SELECT title FROM public.events e WHERE e.id = c.event_id),
               'venue', COALESCE((SELECT venue_name FROM public.events e WHERE e.id = c.event_id),
                                 (SELECT name FROM public.venues v WHERE v.id = c.venue_id)))
             FROM public.crews c WHERE c.id = p_crew),
    'members', (SELECT COALESCE(json_agg(json_build_object('user_id', p.user_id, 'name', p.display_name, 'avatar', p.avatar_url) ORDER BY m.joined_at), '[]'::json)
                FROM public.crew_members m JOIN public.profiles p ON p.user_id = m.user_id WHERE m.crew_id = p_crew),
    'messages', (SELECT COALESCE(json_agg(x ORDER BY x.created_at), '[]'::json) FROM (
                   SELECT cm.id, cm.user_id, cm.body, cm.created_at, p.display_name AS name
                   FROM public.crew_messages cm JOIN public.profiles p ON p.user_id = cm.user_id
                   WHERE cm.crew_id = p_crew ORDER BY cm.created_at DESC LIMIT 60) x)
  ) INTO v_out;
  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_crew_message(p_crew uuid, p_body text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT public._in_crew(p_crew, v_user) THEN RAISE EXCEPTION 'Not in this crew'; END IF;
  IF coalesce(btrim(p_body),'') = '' THEN RAISE EXCEPTION 'Empty'; END IF;
  INSERT INTO public.crew_messages (crew_id, user_id, body) VALUES (p_crew, v_user, left(p_body, 500));
  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_crew(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_crew(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_crew_message(uuid, text) TO authenticated;
