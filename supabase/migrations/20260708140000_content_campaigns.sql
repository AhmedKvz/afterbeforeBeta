-- ============================================================
-- Content campaigns — sponsored quests become a UGC machine (ECONOMY §8b/§8c).
-- People post photo/video from the night, verified members vote, sponsor pays
-- the reward (tickets for the crew / trip / merch). Makes sponsored quests ALIVE.
-- ============================================================

ALTER TABLE public.sponsored_quests ADD COLUMN IF NOT EXISTS kind  text NOT NULL DEFAULT 'perk';   -- 'perk' | 'content'
ALTER TABLE public.sponsored_quests ADD COLUMN IF NOT EXISTS media text NOT NULL DEFAULT 'photo';  -- 'photo' | 'video' | 'both'

CREATE TABLE IF NOT EXISTS public.campaign_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsored_id uuid NOT NULL REFERENCES public.sponsored_quests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'photo',   -- 'photo' | 'video'
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.campaign_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.campaign_submissions(id) ON DELETE CASCADE,
  voter uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, voter)
);
CREATE INDEX IF NOT EXISTS idx_camp_sub ON public.campaign_submissions(sponsored_id);
CREATE INDEX IF NOT EXISTS idx_camp_vote ON public.campaign_votes(submission_id);
ALTER TABLE public.campaign_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_votes ENABLE ROW LEVEL SECURITY;

-- "Verified member" = has been on the scene (≥1 check-in). Kills vote farming.
CREATE OR REPLACE FUNCTION public._is_verified(p_user uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.venue_checkins WHERE user_id = p_user);
$$;

CREATE OR REPLACE FUNCTION public.submit_campaign(p_sponsored uuid, p_media_url text, p_media_type text, p_caption text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF coalesce(btrim(p_media_url),'') = '' THEN RAISE EXCEPTION 'Media required'; END IF;
  INSERT INTO public.campaign_submissions (sponsored_id, user_id, media_url, media_type, caption)
  VALUES (p_sponsored, v_user, p_media_url, coalesce(p_media_type,'photo'), p_caption)
  RETURNING id INTO v_id;
  RETURN json_build_object('ok', true, 'id', v_id);
END; $$;

CREATE OR REPLACE FUNCTION public.vote_campaign(p_submission uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_deleted int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF NOT public._is_verified(v_user) THEN RAISE EXCEPTION 'Samo verifikovani članovi (bar 1 check-in) glasaju'; END IF;
  DELETE FROM public.campaign_votes WHERE submission_id = p_submission AND voter = v_user;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    INSERT INTO public.campaign_votes (submission_id, voter) VALUES (p_submission, v_user);
    RETURN json_build_object('ok', true, 'voted', true);
  END IF;
  RETURN json_build_object('ok', true, 'voted', false);
END; $$;

CREATE OR REPLACE FUNCTION public.get_campaign(p_sponsored uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_out json;
BEGIN
  SELECT json_build_object(
    'campaign', (SELECT json_build_object('id', s.id, 'venue', s.venue_name, 'logo', s.logo, 'title', s.title,
                  'description', s.description, 'reward', s.reward_label, 'media', s.media, 'spots', s.spots_label)
                FROM public.sponsored_quests s WHERE s.id = p_sponsored),
    'submissions', (SELECT COALESCE(json_agg(x ORDER BY x.votes DESC, x.created_at), '[]'::json) FROM (
        SELECT cs.id, cs.user_id, p.display_name AS name, cs.media_url, cs.media_type, cs.caption, cs.created_at,
               (SELECT count(*) FROM public.campaign_votes v WHERE v.submission_id = cs.id) AS votes,
               EXISTS (SELECT 1 FROM public.campaign_votes v WHERE v.submission_id = cs.id AND v.voter = v_user) AS mine
        FROM public.campaign_submissions cs JOIN public.profiles p ON p.user_id = cs.user_id
        WHERE cs.sponsored_id = p_sponsored) x)
  ) INTO v_out;
  RETURN v_out;
END; $$;

GRANT EXECUTE ON FUNCTION public.submit_campaign(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vote_campaign(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign(uuid) TO authenticated;

-- Showcase campaigns so the beta shows full potential (demo target brands, PARTNERS Ring 3)
INSERT INTO public.sponsored_quests (code, venue_name, logo, hue, title, description, reward_label, target_count, xp_reward, spots_label, is_active, sort, kind, media) VALUES
  ('heineken_after', 'Heineken', '🍺', 130, 'Najbolja after fotka',
   'Snimi svoj after (žurka je sveta — kamera na afteru). Najbolja fotka nosi ekipu na sledeći EXIT.',
   '4× EXIT karte za ekipu', 1, 0, 'Glasa cela scena', true, 10, 'content', 'photo'),
  ('jungle_before', 'Jungle Travel', '✈️', 200, 'Najbolji before video',
   'Pokaži nam kako se sprema ekipa — najbolji before video vodi crew na produženi vikend u Amsterdam.',
   'Putovanje za ceo crew', 1, 0, 'Glasa cela scena', true, 11, 'content', 'video')
ON CONFLICT (code) DO NOTHING;
