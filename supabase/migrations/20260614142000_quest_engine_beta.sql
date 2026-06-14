-- Beta tuning for the Quest Engine: maximize & honestly measure creation.
-- 1) Unlock Tier 1 (private/crew) from the start so every tester can create.
-- 2) Mark seed/demo quests so they don't pollute the "real creation" metric.

-- ============================================================
-- 1. Tier 1 at level 1 (everyone can make private/crew). Higher tiers unchanged.
-- ============================================================
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

  IF v_level >= 1 THEN v_tier := 1; END IF;                                  -- was >= 2
  IF v_tier >= 1 AND v_level >= 3  AND v_created >= 2  THEN v_tier := 2; END IF;
  IF v_tier >= 2 AND v_level >= 5  AND v_created >= 5  THEN v_tier := 3; END IF;
  IF v_tier >= 3 AND v_level >= 7  AND v_created >= 10 THEN v_tier := 4; END IF;
  IF v_tier >= 4 AND v_level >= 10 AND v_created >= 20 THEN v_tier := 5; END IF;
  RETURN v_tier;
END;
$$;

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
    'tier', v_tier, 'level', v_level, 'created', v_created,
    'requirements', json_build_array(
      json_build_object('tier', 1, 'need_level', 1,  'need_created', 0,  'met', v_tier >= 1),
      json_build_object('tier', 2, 'need_level', 3,  'need_created', 2,  'met', v_tier >= 2),
      json_build_object('tier', 3, 'need_level', 5,  'need_created', 5,  'met', v_tier >= 3),
      json_build_object('tier', 4, 'need_level', 7,  'need_created', 10, 'met', v_tier >= 4),
      json_build_object('tier', 5, 'need_level', 10, 'need_created', 20, 'met', v_tier >= 5)
    )
  );
END;
$$;

-- ============================================================
-- 2. Seed flag — keep demo quests as social proof, exclude from the real metric
-- ============================================================
ALTER TABLE public.custom_quests ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false;

-- Mark the demo community quests (created by test accounts) as seed.
UPDATE public.custom_quests SET is_seed = true
WHERE creator_id IN (
  '982c07b3-fe10-4283-8f7d-e4a1b5e1827a',  -- iva.test
  '62f3a0fd-ab16-43a5-8eac-dc2377fd79e5',  -- marko.test
  '4dbb14cb-8d9c-454a-b8b2-a0be9ec46419'   -- lana.test
);

-- Stats now exclude seed quests, so the counter reflects REAL creation only.
CREATE OR REPLACE FUNCTION public.get_quest_engine_stats()
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid();
BEGIN
  RETURN json_build_object(
    'total_created',    (SELECT COUNT(*) FROM public.custom_quests WHERE NOT is_seed),
    'created_this_week',(SELECT COUNT(*) FROM public.custom_quests WHERE NOT is_seed AND created_at >= now() - interval '7 days'),
    'unique_creators',  (SELECT COUNT(DISTINCT creator_id) FROM public.custom_quests WHERE NOT is_seed),
    'my_created',       (SELECT COUNT(*) FROM public.custom_quests WHERE creator_id = v_user AND NOT is_seed)
  );
END;
$$;
