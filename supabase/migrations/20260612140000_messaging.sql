-- Phase 3: wave -> chat messaging

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL,          -- always least(uid) for dedupe
  user_b UUID NOT NULL,          -- always greatest(uid)
  status TEXT NOT NULL DEFAULT 'wave',   -- 'wave' | 'active'
  initiated_by UUID NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b)
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read conv" ON public.conversations FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON public.messages(conversation_id, created_at);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read msgs" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)));

-- helper: ordered pair + ensure conversation, returns id
CREATE OR REPLACE FUNCTION public.ensure_conversation(p_target UUID, p_initiator UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a UUID; b UUID; cid UUID;
BEGIN
  a := LEAST(p_initiator, p_target); b := GREATEST(p_initiator, p_target);
  SELECT id INTO cid FROM public.conversations WHERE user_a = a AND user_b = b;
  IF cid IS NULL THEN
    INSERT INTO public.conversations (user_a, user_b, status, initiated_by)
    VALUES (a, b, 'wave', p_initiator) RETURNING id INTO cid;
  END IF;
  RETURN cid;
END;$$;

-- send a wave (anyone can). If the other already engaged -> active.
CREATE OR REPLACE FUNCTION public.send_wave(p_target UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID := auth.uid(); cid UUID; conv RECORD;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.blocks WHERE (blocker_id=p_target AND blocked_id=v)) THEN RAISE EXCEPTION 'Blocked'; END IF;
  cid := public.ensure_conversation(p_target, v);
  SELECT * INTO conv FROM public.conversations WHERE id = cid;
  -- a wave back (other initiated) opens the chat
  IF conv.initiated_by <> v THEN
    UPDATE public.conversations SET status='active' WHERE id=cid;
  END IF;
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (p_target, 'wave', 'Neko te je pozdravio 👋', 'Imaš novi pozdrav', json_build_object('conversationId', cid, 'fromUserId', v));
  RETURN json_build_object('conversation_id', cid);
END;$$;

-- send a message. Any reply by the recipient opens the chat (active).
CREATE OR REPLACE FUNCTION public.send_message(p_conversation UUID, p_body TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID := auth.uid(); conv RECORD; other UUID;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO conv FROM public.conversations WHERE id = p_conversation;
  IF conv IS NULL OR (v <> conv.user_a AND v <> conv.user_b) THEN RAISE EXCEPTION 'Not a participant'; END IF;
  other := CASE WHEN v = conv.user_a THEN conv.user_b ELSE conv.user_a END;
  IF EXISTS (SELECT 1 FROM public.blocks WHERE (blocker_id=other AND blocked_id=v) OR (blocker_id=v AND blocked_id=other)) THEN RAISE EXCEPTION 'Blocked'; END IF;
  INSERT INTO public.messages (conversation_id, sender_id, body) VALUES (p_conversation, v, p_body);
  -- recipient replying opens chat
  IF conv.status = 'wave' AND conv.initiated_by <> v THEN
    UPDATE public.conversations SET status='active' WHERE id=p_conversation;
  END IF;
  UPDATE public.conversations SET last_message = LEFT(p_body, 120), last_message_at = now() WHERE id = p_conversation;
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (other, 'message', 'Nova poruka 💬', LEFT(p_body, 80), json_build_object('conversationId', p_conversation, 'fromUserId', v));
  RETURN json_build_object('ok', true);
END;$$;

-- my conversations with the other person's profile + unread count
CREATE OR REPLACE FUNCTION public.get_conversations()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID := auth.uid(); res JSON;
BEGIN
  IF v IS NULL THEN RETURN '[]'::json; END IF;
  SELECT COALESCE(json_agg(row ORDER BY (row->>'last_at') DESC NULLS LAST), '[]'::json) INTO res FROM (
    SELECT json_build_object(
      'id', c.id, 'status', c.status, 'initiated_by', c.initiated_by,
      'other_id', other.user_id, 'name', other.display_name, 'avatar', other.avatar_url,
      'last_message', c.last_message, 'last_at', COALESCE(c.last_message_at, c.created_at),
      'unread', (SELECT count(*) FROM public.messages m WHERE m.conversation_id = c.id AND m.sender_id <> v AND m.read_at IS NULL),
      'is_incoming_wave', (c.status='wave' AND c.initiated_by <> v)
    ) AS row, COALESCE(c.last_message_at, c.created_at) AS last_at
    FROM public.conversations c
    JOIN public.profiles other ON other.user_id = (CASE WHEN c.user_a = v THEN c.user_b ELSE c.user_a END)
    WHERE (c.user_a = v OR c.user_b = v)
      AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE (b.blocker_id=v AND b.blocked_id=other.user_id) OR (b.blocker_id=other.user_id AND b.blocked_id=v))
  ) q;
  RETURN res;
END;$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID := auth.uid();
BEGIN
  UPDATE public.messages SET read_at = now()
  WHERE conversation_id = p_conversation AND sender_id <> v AND read_at IS NULL;
END;$$;
