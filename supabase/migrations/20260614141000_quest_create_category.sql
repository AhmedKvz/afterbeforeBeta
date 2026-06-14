-- Add category to quest creation. Drop the 9-arg version, recreate with p_category.
DROP FUNCTION IF EXISTS public.create_user_quest(text,text,text,text,integer,integer,text,boolean,text);

CREATE OR REPLACE FUNCTION public.create_user_quest(
  p_icon TEXT, p_title TEXT, p_description TEXT, p_kind TEXT,
  p_target INTEGER, p_xp INTEGER, p_timeframe TEXT,
  p_is_crew BOOLEAN, p_visibility TEXT, p_category TEXT DEFAULT 'custom'
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

  v_status := CASE
    WHEN v_vis IN ('private','crew') THEN 'approved'
    WHEN v_vis = 'community' THEN 'pending'
    WHEN v_vis = 'public' AND v_tier >= 3 THEN 'approved'
    WHEN v_vis IN ('public','venue','sponsored') THEN 'pending'
    ELSE 'approved' END;

  INSERT INTO public.custom_quests
    (creator_id, icon, title, description, kind, target_count, xp_reward, timeframe, deadline, is_crew, visibility, moderation_status, tier_required, category)
  VALUES
    (v_user, COALESCE(p_icon,'🎯'), p_title, p_description, COALESCE(p_kind,'walk'),
     GREATEST(p_target,1), GREATEST(p_xp,0), COALESCE(p_timeframe,'week'), v_deadline,
     COALESCE(p_is_crew,false) OR v_vis='crew', v_vis, v_status, v_need, COALESCE(NULLIF(p_category,''),'custom'))
  RETURNING id INTO v_id;

  INSERT INTO public.custom_quest_members (quest_id, user_id, status)
  VALUES (v_id, v_user, 'joined');

  RETURN json_build_object('id', v_id, 'deadline', v_deadline, 'visibility', v_vis, 'moderation_status', v_status, 'tier', v_tier);
END;
$$;
