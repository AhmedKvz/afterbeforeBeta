-- Phase 4: stories (24h) + reports + media bucket

CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  venue_name TEXT,
  media_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX IF NOT EXISTS idx_stories_active ON public.stories(expires_at);
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads active stories" ON public.stories FOR SELECT USING (expires_at > now());
CREATE POLICY "users add own story" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own story" ON public.stories FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reporters create" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reporters read own" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);

-- active stories grouped by user (exclude blocked)
CREATE OR REPLACE FUNCTION public.get_active_stories()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID := auth.uid(); res JSON;
BEGIN
  SELECT COALESCE(json_agg(g ORDER BY (g->>'latest') DESC), '[]'::json) INTO res FROM (
    SELECT json_build_object(
      'user_id', pr.user_id, 'name', pr.display_name, 'avatar', pr.avatar_url,
      'latest', max(s.created_at),
      'stories', json_agg(json_build_object('id', s.id, 'media_url', s.media_url, 'caption', s.caption, 'venue', s.venue_name, 'created_at', s.created_at) ORDER BY s.created_at)
    ) AS g
    FROM public.stories s
    JOIN public.profiles pr ON pr.user_id = s.user_id
    WHERE s.expires_at > now()
      AND (v IS NULL OR NOT EXISTS (SELECT 1 FROM public.blocks b WHERE (b.blocker_id=v AND b.blocked_id=s.user_id) OR (b.blocker_id=s.user_id AND b.blocked_id=v)))
    GROUP BY pr.user_id, pr.display_name, pr.avatar_url
  ) q;
  RETURN res;
END;$$;

CREATE OR REPLACE FUNCTION public.report_user(p_target UUID, p_reason TEXT, p_details TEXT DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID := auth.uid();
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.reports (reporter_id, target_user_id, reason, details) VALUES (v, p_target, p_reason, p_details);
  RETURN json_build_object('reported', true);
END;$$;

-- media bucket (stories + avatars)
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "media public read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "media own upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "media own delete" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
