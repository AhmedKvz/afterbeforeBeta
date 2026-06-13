-- Phase 2: request-to-unlock for locked mementos + public profile diary

-- migrate old 'close_friends' to 'locked' (request model)
UPDATE public.mementos SET visibility = 'locked' WHERE visibility = 'close_friends';

CREATE TABLE IF NOT EXISTS public.memento_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memento_id UUID NOT NULL REFERENCES public.mementos(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  requester_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | denied
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (memento_id, requester_id)
);
ALTER TABLE public.memento_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requester manages own" ON public.memento_requests FOR ALL
  USING (auth.uid() = requester_id) WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "owner sees requests" ON public.memento_requests FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "owner updates requests" ON public.memento_requests FOR UPDATE USING (auth.uid() = owner_id);

-- mementos visibility: public | locked (request) | private (owner only)
DROP POLICY IF EXISTS "view permitted mementos" ON public.mementos;
CREATE POLICY "view permitted mementos" ON public.mementos FOR SELECT USING (
  visibility = 'public'
  OR (visibility = 'locked' AND EXISTS (
    SELECT 1 FROM public.memento_requests r WHERE r.memento_id = mementos.id AND r.requester_id = auth.uid() AND r.status = 'approved'
  ))
);

-- request access to a locked memento
CREATE OR REPLACE FUNCTION public.request_memento(p_memento UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID := auth.uid(); v_owner UUID; v_event UUID;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT user_id, event_id INTO v_owner, v_event FROM public.mementos WHERE id = p_memento;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_owner = v THEN RETURN json_build_object('ok', true); END IF;
  INSERT INTO public.memento_requests (memento_id, owner_id, requester_id)
  VALUES (p_memento, v_owner, v) ON CONFLICT (memento_id, requester_id) DO NOTHING;
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (v_owner, 'memento_request', 'Access request 🔓', 'Someone wants to see a private night', json_build_object('mementoId', p_memento, 'fromUserId', v));
  RETURN json_build_object('requested', true);
END;$$;

-- owner approves / denies a request
CREATE OR REPLACE FUNCTION public.respond_memento_request(p_request UUID, p_approve BOOLEAN)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID := auth.uid(); v_requester UUID;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.memento_requests SET status = CASE WHEN p_approve THEN 'approved' ELSE 'denied' END
  WHERE id = p_request AND owner_id = v
  RETURNING requester_id INTO v_requester;
  IF v_requester IS NULL THEN RAISE EXCEPTION 'Not your request'; END IF;
  IF p_approve THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (v_requester, 'memento_grant', 'Access granted 🔓', 'You can now see that private night', '{}'::jsonb);
  END IF;
  RETURN json_build_object('ok', true, 'approved', p_approve);
END;$$;

-- a user's diary nights (mementos). Others see only public/locked; locked content gated by approval.
CREATE OR REPLACE FUNCTION public.get_user_nights(p_user UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID := auth.uid(); res JSON;
BEGIN
  SELECT COALESCE(json_agg(row ORDER BY (row->>'created_at') DESC), '[]'::json) INTO res FROM (
    SELECT json_build_object(
      'memento_id', m.id, 'event_id', m.event_id,
      'title', COALESCE(e.title, e.venue_name, 'A night'),
      'venue', e.venue_name, 'date', e.date, 'image', e.image_url,
      'visibility', m.visibility, 'created_at', m.created_at,
      'open', open_q.is_open,
      'note', CASE WHEN open_q.is_open THEN m.note ELSE NULL END,
      'media_url', CASE WHEN open_q.is_open THEN m.media_url ELSE NULL END,
      'request_status', (SELECT status FROM public.memento_requests r WHERE r.memento_id = m.id AND r.requester_id = v)
    ) AS row, m.created_at
    FROM public.mementos m
    LEFT JOIN public.events e ON e.id = m.event_id
    CROSS JOIN LATERAL (
      SELECT (m.visibility = 'public' OR v = p_user OR EXISTS (
        SELECT 1 FROM public.memento_requests r WHERE r.memento_id = m.id AND r.requester_id = v AND r.status = 'approved'
      )) AS is_open
    ) open_q
    WHERE m.user_id = p_user AND (v = p_user OR m.visibility IN ('public', 'locked'))
  ) q;
  RETURN res;
END;$$;

-- public profile header (basics + vibe + counts), readable by anyone
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE res JSON;
BEGIN
  SELECT json_build_object(
    'user_id', p.user_id, 'display_name', p.display_name, 'avatar_url', p.avatar_url,
    'city', p.city, 'level', p.level, 'xp', p.xp,
    'music', p.music_preferences,
    'has_morning_star', EXISTS (SELECT 1 FROM public.user_achievements ua WHERE ua.user_id = p.user_id AND ua.achievement_id = 'morning_star'),
    'checkins', (SELECT count(*) FROM public.event_checkins c WHERE c.user_id = p.user_id),
    'matches', COALESCE(p.total_matches, 0)
  ) INTO res FROM public.profiles p WHERE p.user_id = p_user;
  RETURN res;
END;$$;

-- pending access requests for the owner
CREATE OR REPLACE FUNCTION public.get_memento_requests()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID := auth.uid(); res JSON;
BEGIN
  SELECT COALESCE(json_agg(json_build_object(
    'id', r.id, 'requester_id', r.requester_id, 'name', pr.display_name, 'avatar', pr.avatar_url,
    'memento_id', r.memento_id, 'night', COALESCE(e.title, e.venue_name, 'a night'), 'created_at', r.created_at
  ) ORDER BY r.created_at DESC), '[]'::json) INTO res
  FROM public.memento_requests r
  JOIN public.profiles pr ON pr.user_id = r.requester_id
  LEFT JOIN public.mementos m ON m.id = r.memento_id
  LEFT JOIN public.events e ON e.id = m.event_id
  WHERE r.owner_id = v AND r.status = 'pending';
  RETURN res;
END;$$;
