-- Minimum viable moderation: auto-hide at 5 flags.
-- Covers: reviews, stories. Quest content uses manual moderation_status.
-- Z11/Z12: community keeps itself safe.

-- ── 1. Reviews: prevent double-flagging by same user ─────────────────────────
ALTER TABLE public.review_reports
  ADD CONSTRAINT review_reports_user_review_unique UNIQUE (review_id, user_id);

-- ── 2. Reviews: auto-flag when report_count reaches threshold ─────────────────
CREATE OR REPLACE FUNCTION public.auto_flag_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.report_count >= 5 AND (OLD.moderation_status IS DISTINCT FROM 'flagged') THEN
    UPDATE public.event_reviews
    SET moderation_status = 'flagged'
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_flag_review ON public.event_reviews;
CREATE TRIGGER trg_auto_flag_review
AFTER UPDATE OF report_count ON public.event_reviews
FOR EACH ROW EXECUTE FUNCTION public.auto_flag_review();

-- ── 3. Stories: add flag_count + is_hidden ────────────────────────────────────
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS flag_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_hidden   BOOLEAN NOT NULL DEFAULT false;

-- Per-user dedupe for story flags
CREATE TABLE IF NOT EXISTS public.story_flags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason     TEXT NOT NULL DEFAULT 'inappropriate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);
ALTER TABLE public.story_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flag own" ON public.story_flags FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "read own flags" ON public.story_flags FOR SELECT USING (user_id = auth.uid());

-- Trigger: increment flag_count and auto-hide at 5
CREATE OR REPLACE FUNCTION public.on_story_flag()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.stories
  SET flag_count = flag_count + 1,
      is_hidden  = (flag_count + 1 >= 5)
  WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_story_flag ON public.story_flags;
CREATE TRIGGER trg_story_flag
AFTER INSERT ON public.story_flags
FOR EACH ROW EXECUTE FUNCTION public.on_story_flag();

-- ── 4. Update RLS on stories to exclude hidden ones ───────────────────────────
DROP POLICY IF EXISTS "anyone reads active stories" ON public.stories;
CREATE POLICY "anyone reads active stories" ON public.stories
  FOR SELECT USING (expires_at > now() AND is_hidden = false);

-- ── 5. RPC: flag a story (idempotent via UNIQUE) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.flag_story(p_story_id UUID, p_reason TEXT DEFAULT 'inappropriate')
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Can't flag your own story
  IF EXISTS (SELECT 1 FROM public.stories WHERE id = p_story_id AND user_id = v_user) THEN
    RAISE EXCEPTION 'Ne možeš prijaviti vlastitu priču';
  END IF;

  INSERT INTO public.story_flags (story_id, user_id, reason)
  VALUES (p_story_id, v_user, p_reason)
  ON CONFLICT (story_id, user_id) DO NOTHING;

  RETURN json_build_object('flagged', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.flag_story(UUID, TEXT) TO authenticated;

-- ── 6. RPC: flag a review (wraps review_reports insert, idempotent) ──────────
CREATE OR REPLACE FUNCTION public.flag_review(p_review_id UUID, p_reason TEXT DEFAULT 'inappropriate')
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.review_reports (review_id, user_id, reason)
  VALUES (p_review_id, v_user, p_reason)
  ON CONFLICT (review_id, user_id) DO NOTHING;

  RETURN json_build_object('flagged', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.flag_review(UUID, TEXT) TO authenticated;
