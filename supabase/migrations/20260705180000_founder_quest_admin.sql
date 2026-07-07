-- ============================================================
-- Founder quest admin — the founder authors/edits quests himself
-- (the seeded "Prvih 50 → welcome shot" is generic filler; the founder,
-- an actual clubber, knows what real quests are). Server-gated writes so
-- only the founder account can mutate quests.
-- ============================================================

CREATE OR REPLACE FUNCTION public._is_founder()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND lower(email) = 'kavazovic.ahmed@gmail.com'
  );
$$;

-- Weekly quest upsert (p_id NULL = create). quest_type MUST be a tracked type
-- or the quest never measures progress — the UI enforces the allowed list.
CREATE OR REPLACE FUNCTION public.admin_save_quest(
  p_id uuid, p_title text, p_description text, p_quest_type text,
  p_target int, p_xp int, p_icon text, p_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF coalesce(btrim(p_title), '') = '' THEN RAISE EXCEPTION 'Title required'; END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.quests (title, description, quest_type, target_count, xp_reward, icon, is_active)
    VALUES (p_title, p_description, p_quest_type, GREATEST(coalesce(p_target,1),1), GREATEST(coalesce(p_xp,0),0), coalesce(p_icon,'🎯'), coalesce(p_active,true))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.quests
    SET title=p_title, description=p_description, quest_type=p_quest_type,
        target_count=GREATEST(coalesce(p_target,1),1), xp_reward=GREATEST(coalesce(p_xp,0),0),
        icon=coalesce(p_icon,'🎯'), is_active=coalesce(p_active,true)
    WHERE id=p_id RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

-- Sponsored quest upsert
CREATE OR REPLACE FUNCTION public.admin_save_sponsored(
  p_id uuid, p_venue_name text, p_logo text, p_title text, p_description text,
  p_reward_label text, p_target int, p_xp int, p_spots_label text, p_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF coalesce(btrim(p_title), '') = '' THEN RAISE EXCEPTION 'Title required'; END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.sponsored_quests (code, venue_name, logo, title, description, reward_label, target_count, xp_reward, spots_label, is_active, sort)
    VALUES ('c_' || substr(md5(random()::text || clock_timestamp()::text), 1, 10), p_venue_name, coalesce(p_logo,'⭐'), p_title, p_description, p_reward_label, GREATEST(coalesce(p_target,1),1), GREATEST(coalesce(p_xp,0),0), p_spots_label, coalesce(p_active,true), 100)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.sponsored_quests
    SET venue_name=p_venue_name, logo=coalesce(p_logo,'⭐'), title=p_title, description=p_description,
        reward_label=p_reward_label, target_count=GREATEST(coalesce(p_target,1),1), xp_reward=GREATEST(coalesce(p_xp,0),0),
        spots_label=p_spots_label, is_active=coalesce(p_active,true)
    WHERE id=p_id RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public._is_founder() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_quest(uuid, text, text, text, int, int, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_sponsored(uuid, text, text, text, text, text, int, int, text, boolean) TO authenticated;
