-- Iskra (Spark): contextual, time-boxed connection signal between people at the SAME venue.
-- Anonymous to the recipient until MUTUAL; mutual → opens a chat (existing conversations).
-- Window 36h, max 3/night, women/solo-first opt-out, blocks respected. No free text until mutual.
-- Same-party context = both have a venue_checkin at the venue in the last 12h.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sparks_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.sparks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL,
  to_user UUID NOT NULL,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'sent',         -- sent | mutual | expired
  conversation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '36 hours',
  UNIQUE (from_user, to_user, venue_id)
);
CREATE INDEX IF NOT EXISTS idx_sparks_to ON public.sparks(to_user, status);
CREATE INDEX IF NOT EXISTS idx_sparks_from ON public.sparks(from_user, created_at DESC);
ALTER TABLE public.sparks ENABLE ROW LEVEL SECURITY;
-- Sender may read own sent sparks (they chose the target). Recipient reads via RPC (anonymized).
CREATE POLICY "sender reads own sparks" ON public.sparks FOR SELECT USING (from_user = auth.uid());

-- Helper: are two users "at the same party" (both checked in at venue in last 12h)?
CREATE OR REPLACE FUNCTION public.both_at_venue(p_a UUID, p_b UUID, p_venue UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.venue_checkins WHERE user_id = p_a AND venue_id = p_venue AND created_at > now() - interval '12 hours')
     AND EXISTS (SELECT 1 FROM public.venue_checkins WHERE user_id = p_b AND venue_id = p_venue AND created_at > now() - interval '12 hours');
$$;

-- Send a spark to a (visible) person from the who's-here pool. Mutual if they already sparked you.
CREATE OR REPLACE FUNCTION public.send_spark(p_to UUID, p_venue UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_reverse UUID;
  v_cid UUID;
  v_enabled BOOLEAN;
  v_sent_today INT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_to = v_user THEN RAISE EXCEPTION 'Cannot spark yourself'; END IF;

  IF EXISTS (SELECT 1 FROM public.blocks WHERE (blocker_id=p_to AND blocked_id=v_user) OR (blocker_id=v_user AND blocked_id=p_to)) THEN
    RAISE EXCEPTION 'Blocked';
  END IF;

  SELECT COALESCE(sparks_enabled, true) INTO v_enabled FROM public.profiles WHERE user_id = p_to;
  IF NOT COALESCE(v_enabled, true) THEN RAISE EXCEPTION 'This person is not receiving sparks'; END IF;

  IF NOT public.both_at_venue(v_user, p_to, p_venue) THEN
    RAISE EXCEPTION 'You can only spark someone at the same party';
  END IF;

  -- 3 per rolling night
  SELECT COUNT(*) INTO v_sent_today FROM public.sparks WHERE from_user = v_user AND created_at > now() - interval '24 hours';
  IF v_sent_today >= 3 THEN RAISE EXCEPTION 'Out of sparks tonight (3 max)'; END IF;

  -- Mutual? (they already sparked me at this venue, still live)
  SELECT id INTO v_reverse FROM public.sparks
    WHERE from_user = p_to AND to_user = v_user AND venue_id = p_venue AND status = 'sent' AND expires_at > now();

  IF v_reverse IS NOT NULL THEN
    v_cid := public.ensure_conversation(p_to, v_user);
    UPDATE public.sparks SET status='mutual', conversation_id=v_cid WHERE id = v_reverse;
    INSERT INTO public.sparks (from_user, to_user, venue_id, status, conversation_id)
      VALUES (v_user, p_to, p_venue, 'mutual', v_cid)
      ON CONFLICT (from_user, to_user, venue_id)
      DO UPDATE SET status='mutual', conversation_id=v_cid;
    RETURN json_build_object('mutual', true, 'conversation_id', v_cid, 'other_id', p_to);
  END IF;

  -- One-way spark (anonymous to recipient)
  INSERT INTO public.sparks (from_user, to_user, venue_id, status)
    VALUES (v_user, p_to, p_venue, 'sent')
    ON CONFLICT (from_user, to_user, venue_id) DO NOTHING;
  RETURN json_build_object('mutual', false);
END;
$$;

-- Respond to a received (anonymized) spark from the inbox → reveals + opens chat.
CREATE OR REPLACE FUNCTION public.respond_spark(p_spark UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_from UUID;
  v_venue UUID;
  v_cid UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT from_user, venue_id INTO v_from, v_venue FROM public.sparks
    WHERE id = p_spark AND to_user = v_user AND status = 'sent' AND expires_at > now();
  IF v_from IS NULL THEN RAISE EXCEPTION 'Spark not found or expired'; END IF;

  v_cid := public.ensure_conversation(v_from, v_user);
  UPDATE public.sparks SET status='mutual', conversation_id=v_cid WHERE id = p_spark;
  INSERT INTO public.sparks (from_user, to_user, venue_id, status, conversation_id)
    VALUES (v_user, v_from, v_venue, 'mutual', v_cid)
    ON CONFLICT (from_user, to_user, venue_id) DO UPDATE SET status='mutual', conversation_id=v_cid;

  RETURN json_build_object('mutual', true, 'conversation_id', v_cid, 'other_id', v_from);
END;
$$;

-- Inbox: pending sparks sent TO me — anonymized (no from_user revealed), with venue context.
CREATE OR REPLACE FUNCTION public.get_received_sparks()
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN COALESCE((
    SELECT json_agg(json_build_object(
      'id', s.id, 'venue_id', s.venue_id, 'venue_name', v.name, 'venue_emoji', v.emoji,
      'created_at', s.created_at, 'expires_at', s.expires_at
    ) ORDER BY s.created_at DESC)
    FROM public.sparks s JOIN public.venues v ON v.id = s.venue_id
    WHERE s.to_user = v_user AND s.status = 'sent' AND s.expires_at > now()
  ), '[]'::json);
END;
$$;

-- Pool: people at the same venue I can spark (visible — this is the who's-here side).
CREATE OR REPLACE FUNCTION public.get_sparkable(p_venue UUID)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN COALESCE((
    SELECT json_agg(json_build_object('user_id', p.user_id, 'name', p.display_name, 'avatar', p.avatar_url) ORDER BY p.display_name)
    FROM (SELECT DISTINCT user_id FROM public.venue_checkins
          WHERE venue_id = p_venue AND user_id <> v_user AND created_at > now() - interval '12 hours') c
    JOIN public.profiles p ON p.user_id = c.user_id
    WHERE COALESCE(p.sparks_enabled, true)
      AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE (b.blocker_id=p.user_id AND b.blocked_id=v_user) OR (b.blocker_id=v_user AND b.blocked_id=p.user_id))
      AND NOT EXISTS (SELECT 1 FROM public.sparks s WHERE s.from_user=v_user AND s.to_user=p.user_id AND s.venue_id=p_venue)
  ), '[]'::json);
END;
$$;
