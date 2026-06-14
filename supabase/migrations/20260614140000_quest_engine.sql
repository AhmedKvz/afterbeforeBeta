-- Quest Engine: make creation expressive (categories) + social (community feed)
-- + measurable (creation stats), so we can see how many people create quests in beta.

-- ============================================================
-- 1. Category on custom quests (expressive creation)
-- ============================================================
ALTER TABLE public.custom_quests
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'custom';  -- social/love/adventure/creative/vote/challenge/crew/explore/custom

-- ============================================================
-- 2. Community feed — quests other people made that I can browse + join
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_community_quests()
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  RETURN COALESCE((
    SELECT json_agg(q ORDER BY q.created_at DESC)
    FROM (
      SELECT
        c.id, c.icon, c.title, c.description, c.category, c.xp_reward, c.timeframe,
        c.visibility, c.upvotes, c.created_at,
        c.creator_id = v_user AS is_mine,
        p.display_name AS creator_name,
        p.avatar_url   AS creator_avatar,
        (SELECT COUNT(*) FROM public.custom_quest_members m WHERE m.quest_id = c.id) AS member_count,
        EXISTS (SELECT 1 FROM public.custom_quest_members m
                WHERE m.quest_id = c.id AND m.user_id = v_user AND m.status = 'joined') AS joined
      FROM public.custom_quests c
      LEFT JOIN public.profiles p ON p.user_id = c.creator_id
      WHERE c.visibility IN ('community','public')
        AND c.moderation_status = 'approved'
        AND c.status = 'active'
      ORDER BY c.created_at DESC
      LIMIT 40
    ) q
  ), '[]'::json);
END;
$$;

-- Join (or re-join) any visible quest. RLS already allows inserting own membership.
CREATE OR REPLACE FUNCTION public.join_community_quest(p_quest UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.custom_quest_members (quest_id, user_id, status)
  VALUES (p_quest, v_user, 'joined')
  ON CONFLICT (quest_id, user_id) DO UPDATE SET status = 'joined';
  RETURN json_build_object('joined', true);
END;
$$;

-- ============================================================
-- 3. Creation stats — how many people make quests (our beta metric)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_quest_engine_stats()
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  RETURN json_build_object(
    'total_created',   (SELECT COUNT(*) FROM public.custom_quests),
    'created_this_week',(SELECT COUNT(*) FROM public.custom_quests WHERE created_at >= now() - interval '7 days'),
    'unique_creators', (SELECT COUNT(DISTINCT creator_id) FROM public.custom_quests),
    'my_created',      (SELECT COUNT(*) FROM public.custom_quests WHERE creator_id = v_user)
  );
END;
$$;
