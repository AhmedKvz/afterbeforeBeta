
-- 1. Extend event_reviews
ALTER TABLE public.event_reviews
  ADD COLUMN IF NOT EXISTS vibe_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visit_date DATE,
  ADD COLUMN IF NOT EXISTS venue_name TEXT,
  ADD COLUMN IF NOT EXISTS venue_type TEXT,
  ADD COLUMN IF NOT EXISTS verified_visit BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS helpful_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weight NUMERIC NOT NULL DEFAULT 1.0;

CREATE INDEX IF NOT EXISTS idx_event_reviews_venue_name ON public.event_reviews(venue_name);
CREATE INDEX IF NOT EXISTS idx_event_reviews_created_at ON public.event_reviews(created_at DESC);

-- Backfill venue_name/venue_type from events
UPDATE public.event_reviews r
SET venue_name = e.venue_name,
    venue_type = COALESCE(e.venue_type, 'club')
FROM public.events e
WHERE r.event_id = e.id AND r.venue_name IS NULL;

-- 2. Trigger: mark verified_visit and weight
CREATE OR REPLACE FUNCTION public.set_review_verified_and_weight()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_verified BOOLEAN := false;
BEGIN
  IF NEW.event_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.event_checkins
      WHERE user_id = NEW.user_id AND event_id = NEW.event_id
      UNION
      SELECT 1 FROM public.event_signals
      WHERE user_id = NEW.user_id AND event_id = NEW.event_id
    ) INTO is_verified;
  END IF;

  NEW.verified_visit := is_verified;
  NEW.weight := CASE WHEN is_verified THEN 2.0 ELSE 1.0 END;

  -- Auto-fill venue_name / venue_type if missing
  IF NEW.venue_name IS NULL AND NEW.event_id IS NOT NULL THEN
    SELECT venue_name, COALESCE(venue_type, 'club')
      INTO NEW.venue_name, NEW.venue_type
    FROM public.events WHERE id = NEW.event_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_verified ON public.event_reviews;
CREATE TRIGGER trg_review_verified
BEFORE INSERT ON public.event_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_review_verified_and_weight();

-- 3. review_photos
CREATE TABLE IF NOT EXISTS public.review_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.event_reviews(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_review_photos_review_id ON public.review_photos(review_id);
ALTER TABLE public.review_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view review photos" ON public.review_photos FOR SELECT USING (true);
CREATE POLICY "Authors can add review photos" ON public.review_photos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.event_reviews r WHERE r.id = review_id AND r.user_id = auth.uid()));
CREATE POLICY "Authors can delete review photos" ON public.review_photos FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.event_reviews r WHERE r.id = review_id AND r.user_id = auth.uid()));

-- 4. review_votes
CREATE TABLE IF NOT EXISTS public.review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.event_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_type TEXT NOT NULL DEFAULT 'helpful',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id, vote_type)
);
CREATE INDEX IF NOT EXISTS idx_review_votes_review_id ON public.review_votes(review_id);
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view votes" ON public.review_votes FOR SELECT USING (true);
CREATE POLICY "Users can add own vote" ON public.review_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own vote" ON public.review_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to maintain helpful_count
CREATE OR REPLACE FUNCTION public.sync_review_helpful_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.event_reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.event_reviews SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = OLD.review_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_review_helpful_count ON public.review_votes;
CREATE TRIGGER trg_review_helpful_count
AFTER INSERT OR DELETE ON public.review_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_review_helpful_count();

-- 5. review_reports
CREATE TABLE IF NOT EXISTS public.review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.event_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters view own reports" ON public.review_reports FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Admins view all reports" ON public.review_reports FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create reports" ON public.review_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_review_report_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.event_reviews SET report_count = report_count + 1 WHERE id = NEW.review_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_review_report_count ON public.review_reports;
CREATE TRIGGER trg_review_report_count
AFTER INSERT ON public.review_reports
FOR EACH ROW EXECUTE FUNCTION public.sync_review_report_count();

-- 6. business_replies
CREATE TABLE IF NOT EXISTS public.business_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL UNIQUE REFERENCES public.event_reviews(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL,
  replier_id UUID NOT NULL,
  reply_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_business_replies_review ON public.business_replies(review_id);
ALTER TABLE public.business_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business replies" ON public.business_replies FOR SELECT USING (true);
CREATE POLICY "Venue owners can reply" ON public.business_replies FOR INSERT
  WITH CHECK (
    auth.uid() = replier_id AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.account_type = 'club_venue'
        AND p.venue_name = business_replies.venue_name
    )
  );
CREATE POLICY "Venue owners can update their reply" ON public.business_replies FOR UPDATE
  USING (auth.uid() = replier_id);

CREATE TRIGGER trg_business_replies_updated_at
BEFORE UPDATE ON public.business_replies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. venue_review_summary
CREATE TABLE IF NOT EXISTS public.venue_review_summary (
  venue_name TEXT PRIMARY KEY,
  summary JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.venue_review_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view venue summary" ON public.venue_review_summary FOR SELECT USING (true);

-- 8. get_venue_review_stats
CREATE OR REPLACE FUNCTION public.get_venue_review_stats(p_venue_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  weighted_avg NUMERIC;
  total_count BIGINT;
  verified_count BIGINT;
  with_photos BIGINT;
  tag_freq JSON;
BEGIN
  SELECT
    COALESCE(SUM(rating * weight) / NULLIF(SUM(weight), 0), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE verified_visit)
  INTO weighted_avg, total_count, verified_count
  FROM public.event_reviews
  WHERE venue_name = p_venue_name
    AND (moderation_status IS NULL OR moderation_status <> 'flagged');

  SELECT COUNT(DISTINCT r.id) INTO with_photos
  FROM public.event_reviews r
  JOIN public.review_photos p ON p.review_id = r.id
  WHERE r.venue_name = p_venue_name;

  SELECT json_agg(t ORDER BY (t->>'count')::int DESC)
  INTO tag_freq
  FROM (
    SELECT json_build_object('tag', tag, 'count', COUNT(*)) AS t
    FROM public.event_reviews, unnest(vibe_tags) AS tag
    WHERE venue_name = p_venue_name
    GROUP BY tag
    ORDER BY COUNT(*) DESC
    LIMIT 10
  ) sub;

  RETURN json_build_object(
    'avg_rating', ROUND(weighted_avg, 2),
    'review_count', total_count,
    'verified_count', verified_count,
    'with_photos_count', with_photos,
    'top_tags', COALESCE(tag_freq, '[]'::json)
  );
END;
$$;

-- 9. vote_review_helpful (idempotent toggle)
CREATE OR REPLACE FUNCTION public.toggle_review_helpful(p_review_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing UUID;
  v_count INT;
  v_voted BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_existing FROM public.review_votes
  WHERE review_id = p_review_id AND user_id = v_user_id AND vote_type = 'helpful';

  IF v_existing IS NOT NULL THEN
    DELETE FROM public.review_votes WHERE id = v_existing;
    v_voted := false;
  ELSE
    INSERT INTO public.review_votes (review_id, user_id, vote_type)
    VALUES (p_review_id, v_user_id, 'helpful');
    v_voted := true;
  END IF;

  SELECT helpful_count INTO v_count FROM public.event_reviews WHERE id = p_review_id;
  RETURN json_build_object('voted', v_voted, 'helpful_count', v_count);
END;
$$;

-- 10. Storage bucket for review photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-photos', 'review-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Review photos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-photos');

CREATE POLICY "Users upload own review photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own review photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
