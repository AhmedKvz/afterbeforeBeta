-- Founder can author content campaigns too: admin_save_sponsored gains kind/media.
DROP FUNCTION IF EXISTS public.admin_save_sponsored(uuid, text, text, text, text, text, int, int, text, boolean);

CREATE OR REPLACE FUNCTION public.admin_save_sponsored(
  p_id uuid, p_venue_name text, p_logo text, p_title text, p_description text,
  p_reward_label text, p_target int, p_xp int, p_spots_label text, p_active boolean,
  p_kind text DEFAULT 'perk', p_media text DEFAULT 'photo'
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
    INSERT INTO public.sponsored_quests (code, venue_name, logo, title, description, reward_label, target_count, xp_reward, spots_label, is_active, sort, kind, media)
    VALUES ('c_' || substr(md5(random()::text || clock_timestamp()::text), 1, 10), p_venue_name, coalesce(p_logo,'⭐'), p_title, p_description, p_reward_label, GREATEST(coalesce(p_target,1),1), GREATEST(coalesce(p_xp,0),0), p_spots_label, coalesce(p_active,true), 100, coalesce(p_kind,'perk'), coalesce(p_media,'photo'))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.sponsored_quests
    SET venue_name=p_venue_name, logo=coalesce(p_logo,'⭐'), title=p_title, description=p_description,
        reward_label=p_reward_label, target_count=GREATEST(coalesce(p_target,1),1), xp_reward=GREATEST(coalesce(p_xp,0),0),
        spots_label=p_spots_label, is_active=coalesce(p_active,true), kind=coalesce(p_kind,'perk'), media=coalesce(p_media,'photo')
    WHERE id=p_id RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_save_sponsored(uuid, text, text, text, text, text, int, int, text, boolean, text, text) TO authenticated;
