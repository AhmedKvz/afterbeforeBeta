-- Creator Trust Levels: gate quest creation behind a stacking progression.
-- A user must reach a player level (and a creation track-record) to unlock each
-- successive quest "reach": private → crew → community → public → venue → sponsored.

-- ============================================================
-- 0. Extend custom_quests with reach + moderation
-- ============================================================
ALTER TABLE public.custom_quests
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private',          -- private / crew / community / public / venue / sponsored
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved',  -- approved / pending / rejected
  ADD COLUMN IF NOT EXISTS tier_required INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS upvotes INTEGER NOT NULL DEFAULT 0;

-- Public / community quests that are approved should be visible to everyone.
DROP POLICY IF EXISTS "view own or member custom quests" ON public.custom_quests;
CREATE POLICY "view own or member custom quests" ON public.custom_quests FOR SELECT
  USING (
    creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.custom_quest_members m WHERE m.quest_id = custom_quests.id AND m.user_id = auth.uid())
    OR (visibility IN ('community','public','venue','sponsored') AND moderation_status = 'approved')
  );

-- ============================================================
-- 1. Level + creator-tier helpers
-- ============================================================

-- Lifetime-XP → player level (mirrors src/services/gamification.ts LEVELS).
CREATE OR REPLACE FUNCTION public.level_from_xp(p_xp INTEGER)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_xp >= 75000 THEN 10
    WHEN p_xp >= 50000 THEN 9
    WHEN p_xp >= 35000 THEN 8
    WHEN p_xp >= 20000 THEN 7
    WHEN p_xp >= 10000 THEN 6
    WHEN p_xp >= 5000  THEN 5
    WHEN p_xp >= 2000  THEN 4
    WHEN p_xp >= 1000  THEN 3
    WHEN p_xp >= 500   THEN 2
    ELSE 1 END;
$$;

-- Creator tier (0-5), STACKING: each tier also requires every requirement below it.
-- Requirements use only data that genuinely accrues in beta: player level + quests created.
--   Tier 1 Crew Maker     : level >= 2
--   Tier 2 Contributor    : level >= 3  AND created >= 2
--   Tier 3 Verified Creator: level >= 5 AND created >= 5
--   Tier 4 Pro Creator    : level >= 7  AND created >= 10
--   Tier 5 Partner Creator: level >= 10 AND created >= 20
CREATE OR REPLACE FUNCTION public.creator_tier_for(p_user UUID)
RETURNS INTEGER LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_level INTEGER;
  v_created INTEGER;
  v_tier INTEGER := 0;
BEGIN
  SELECT GREATEST(COALESCE(level, public.level_from_xp(COALESCE(xp,0))), 1)
    INTO v_level FROM public.profiles WHERE user_id = p_user;
  v_level := COALESCE(v_level, 1);
  SELECT COUNT(*) INTO v_created FROM public.custom_quests WHERE creator_id = p_user;

  IF v_level >= 2 THEN v_tier := 1; END IF;
  IF v_tier >= 1 AND v_level >= 3  AND v_created >= 2  THEN v_tier := 2; END IF;
  IF v_tier >= 2 AND v_level >= 5  AND v_created >= 5  THEN v_tier := 3; END IF;
  IF v_tier >= 3 AND v_level >= 7  AND v_created >= 10 THEN v_tier := 4; END IF;
  IF v_tier >= 4 AND v_level >= 10 AND v_created >= 20 THEN v_tier := 5; END IF;
  RETURN v_tier;
END;
$$;

-- What reach each tier can publish (stacking). Used by the create RPC + UI.
CREATE OR REPLACE FUNCTION public.tier_for_visibility(p_visibility TEXT)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_visibility
    WHEN 'private'   THEN 1
    WHEN 'crew'      THEN 1
    WHEN 'community' THEN 2
    WHEN 'public'    THEN 3
    WHEN 'venue'     THEN 4
    WHEN 'sponsored' THEN 5
    ELSE 99 END;
$$;

-- ============================================================
-- 2. get_creator_status — everything the UI needs to render the ladder
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_creator_status()
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_level INTEGER;
  v_created INTEGER;
  v_tier INTEGER;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT GREATEST(COALESCE(level, public.level_from_xp(COALESCE(xp,0))), 1)
    INTO v_level FROM public.profiles WHERE user_id = v_user;
  v_level := COALESCE(v_level, 1);
  SELECT COUNT(*) INTO v_created FROM public.custom_quests WHERE creator_id = v_user;
  v_tier := public.creator_tier_for(v_user);

  RETURN json_build_object(
    'tier', v_tier,
    'level', v_level,
    'created', v_created,
    'requirements', json_build_array(
      json_build_object('tier', 1, 'need_level', 2,  'need_created', 0,  'met', v_tier >= 1),
      json_build_object('tier', 2, 'need_level', 3,  'need_created', 2,  'met', v_tier >= 2),
      json_build_object('tier', 3, 'need_level', 5,  'need_created', 5,  'met', v_tier >= 3),
      json_build_object('tier', 4, 'need_level', 7,  'need_created', 10, 'met', v_tier >= 4),
      json_build_object('tier', 5, 'need_level', 10, 'need_created', 20, 'met', v_tier >= 5)
    )
  );
END;
$$;

-- ============================================================
-- 3. create_user_quest — enforces tier gating + moderation
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_user_quest(
  p_icon TEXT, p_title TEXT, p_description TEXT, p_kind TEXT,
  p_target INTEGER, p_xp INTEGER, p_timeframe TEXT,
  p_is_crew BOOLEAN, p_visibility TEXT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_tier INTEGER;
  v_need INTEGER;
  v_vis TEXT := COALESCE(NULLIF(p_visibility,''), 'private');
  v_deadline DATE;
  v_status TEXT;
  v_id UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  v_tier := public.creator_tier_for(v_user);
  IF v_tier < 1 THEN
    RAISE EXCEPTION 'Reach player level 2 to unlock quest creation';
  END IF;

  v_need := public.tier_for_visibility(v_vis);
  IF v_need > v_tier THEN
    RAISE EXCEPTION 'Creator tier % required for % quests (you are tier %)', v_need, v_vis, v_tier;
  END IF;

  v_deadline := CASE p_timeframe
    WHEN 'today' THEN current_date
    WHEN 'month' THEN current_date + 30
    ELSE current_date + 7 END;

  -- private/crew go live instantly; community needs review; public auto-approved for verified+ creators.
  v_status := CASE
    WHEN v_vis IN ('private','crew') THEN 'approved'
    WHEN v_vis = 'community' THEN 'pending'
    WHEN v_vis = 'public' AND v_tier >= 3 THEN 'approved'
    WHEN v_vis IN ('public','venue','sponsored') THEN 'pending'
    ELSE 'approved' END;

  INSERT INTO public.custom_quests
    (creator_id, icon, title, description, kind, target_count, xp_reward, timeframe, deadline, is_crew, visibility, moderation_status, tier_required)
  VALUES
    (v_user, COALESCE(p_icon,'🎯'), p_title, p_description, COALESCE(p_kind,'walk'),
     GREATEST(p_target,1), GREATEST(p_xp,0), COALESCE(p_timeframe,'week'), v_deadline,
     COALESCE(p_is_crew,false) OR v_vis='crew', v_vis, v_status, v_need)
  RETURNING id INTO v_id;

  INSERT INTO public.custom_quest_members (quest_id, user_id, status)
  VALUES (v_id, v_user, 'joined');

  RETURN json_build_object('id', v_id, 'deadline', v_deadline, 'visibility', v_vis, 'moderation_status', v_status, 'tier', v_tier);
END;
$$;
