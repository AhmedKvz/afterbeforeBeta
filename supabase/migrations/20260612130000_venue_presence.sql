-- Phase 1: opt-in, reciprocal venue presence + blocks

CREATE TABLE IF NOT EXISTS public.venue_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  venue_name TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vp_venue ON public.venue_presence(venue_name, last_seen);
ALTER TABLE public.venue_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own presence" ON public.venue_presence FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage own blocks" ON public.blocks FOR ALL USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

-- set / refresh my presence at a venue (visible = opt-in)
CREATE OR REPLACE FUNCTION public.set_venue_presence(p_venue TEXT, p_visible BOOLEAN)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID := auth.uid();
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.venue_presence (user_id, venue_name, visible, last_seen)
  VALUES (v, p_venue, COALESCE(p_visible, false), now())
  ON CONFLICT (user_id) DO UPDATE SET venue_name = EXCLUDED.venue_name, visible = EXCLUDED.visible, last_seen = now();
  RETURN json_build_object('venue', p_venue, 'visible', COALESCE(p_visible, false));
END;$$;

-- reciprocal who's-here: always headcount; people[] only if caller is visible here
CREATE OR REPLACE FUNCTION public.get_venue_presence(p_venue TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v UUID := auth.uid();
  cutoff TIMESTAMPTZ := now() - interval '3 hours';
  head INT;
  me_visible BOOLEAN := false;
  ppl JSON;
BEGIN
  SELECT count(*) INTO head FROM public.venue_presence WHERE venue_name = p_venue AND last_seen > cutoff;
  IF v IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.venue_presence WHERE user_id = v AND venue_name = p_venue AND visible AND last_seen > cutoff) INTO me_visible;
  END IF;
  IF me_visible THEN
    SELECT COALESCE(json_agg(json_build_object('user_id', p.user_id, 'name', pr.display_name, 'avatar', pr.avatar_url, 'age', pr.age) ORDER BY p.last_seen DESC), '[]'::json)
    INTO ppl
    FROM public.venue_presence p
    JOIN public.profiles pr ON pr.user_id = p.user_id
    WHERE p.venue_name = p_venue AND p.visible AND p.last_seen > cutoff AND p.user_id <> v
      AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE (b.blocker_id = v AND b.blocked_id = p.user_id) OR (b.blocker_id = p.user_id AND b.blocked_id = v));
  ELSE
    ppl := '[]'::json;
  END IF;
  RETURN json_build_object('headcount', head, 'me_visible', me_visible, 'people', ppl);
END;$$;

-- block a user
CREATE OR REPLACE FUNCTION public.block_user(p_target UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID := auth.uid();
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.blocks (blocker_id, blocked_id) VALUES (v, p_target) ON CONFLICT DO NOTHING;
  RETURN json_build_object('blocked', true);
END;$$;
