-- Founding Raver (Ambassador) status: community seed for cold-start.
-- Hand-picked clubbers get OG status + auto creator tier so they can seed public quests.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_founding_raver BOOLEAN NOT NULL DEFAULT false;

-- Creator tier floors at Tier 3 (Verified Creator) for founding ravers → can publish public quests immediately.
CREATE OR REPLACE FUNCTION public.creator_tier_for(p_user UUID)
RETURNS INTEGER LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_level INTEGER;
  v_created INTEGER;
  v_og BOOLEAN;
  v_tier INTEGER := 0;
BEGIN
  SELECT GREATEST(COALESCE(level, public.level_from_xp(COALESCE(xp,0))), 1), COALESCE(is_founding_raver,false)
    INTO v_level, v_og FROM public.profiles WHERE user_id = p_user;
  v_level := COALESCE(v_level, 1);
  SELECT COUNT(*) INTO v_created FROM public.custom_quests WHERE creator_id = p_user;

  IF v_level >= 1 THEN v_tier := 1; END IF;
  IF v_tier >= 1 AND v_level >= 3  AND v_created >= 2  THEN v_tier := 2; END IF;
  IF v_tier >= 2 AND v_level >= 5  AND v_created >= 5  THEN v_tier := 3; END IF;
  IF v_tier >= 3 AND v_level >= 7  AND v_created >= 10 THEN v_tier := 4; END IF;
  IF v_tier >= 4 AND v_level >= 10 AND v_created >= 20 THEN v_tier := 5; END IF;

  IF v_og THEN v_tier := GREATEST(v_tier, 3); END IF;   -- Founding Raver floor
  RETURN v_tier;
END;
$$;

-- Surface the flag in creator status so the UI can show the OG badge.
CREATE OR REPLACE FUNCTION public.get_creator_status()
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_level INTEGER;
  v_created INTEGER;
  v_tier INTEGER;
  v_og BOOLEAN;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT GREATEST(COALESCE(level, public.level_from_xp(COALESCE(xp,0))), 1), COALESCE(is_founding_raver,false)
    INTO v_level, v_og FROM public.profiles WHERE user_id = v_user;
  v_level := COALESCE(v_level, 1);
  SELECT COUNT(*) INTO v_created FROM public.custom_quests WHERE creator_id = v_user;
  v_tier := public.creator_tier_for(v_user);

  RETURN json_build_object(
    'tier', v_tier, 'level', v_level, 'created', v_created, 'is_founding_raver', v_og,
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

-- Grant/revoke is done manually in beta (hand-picked cohort), e.g.:
--   UPDATE public.profiles SET is_founding_raver = true WHERE user_id = '<uuid>';
