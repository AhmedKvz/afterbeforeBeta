-- Post-check-in feedback: single NPS question for Smart Start grant validation.
-- Goal: "X% korisnika bi preporučilo AfterBefore" — grant-ready stat.

CREATE TABLE IF NOT EXISTS public.checkin_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,          -- question key, e.g. 'nps_recommend'
  score       SMALLINT NOT NULL,      -- 1=No 3=Maybe 5=Yes
  label       TEXT NOT NULL,          -- user-facing answer label stored verbatim
  venue_id    UUID,                   -- venue where they checked in (nullable)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.checkin_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own feedback" ON public.checkin_feedback FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "view own feedback"   ON public.checkin_feedback FOR SELECT USING (user_id = auth.uid());

-- RPC: submit one answer; returns whether this was accepted.
CREATE OR REPLACE FUNCTION public.submit_checkin_feedback(
  p_question TEXT,
  p_score    SMALLINT,
  p_label    TEXT,
  p_venue_id UUID DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_score NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Score must be 1–5'; END IF;

  INSERT INTO public.checkin_feedback (user_id, question, score, label, venue_id)
  VALUES (v_user, p_question, p_score, p_label, p_venue_id);

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_checkin_feedback(TEXT, SMALLINT, TEXT, UUID) TO authenticated;

-- Admin view: NPS aggregate (grant dashboard query)
-- SELECT
--   COUNT(*) FILTER (WHERE score = 5) * 100.0 / COUNT(*) AS pct_yes,
--   COUNT(*) FILTER (WHERE score = 3) * 100.0 / COUNT(*) AS pct_maybe,
--   COUNT(*) FILTER (WHERE score = 1) * 100.0 / COUNT(*) AS pct_no,
--   COUNT(*) AS total
-- FROM public.checkin_feedback WHERE question = 'nps_recommend';
