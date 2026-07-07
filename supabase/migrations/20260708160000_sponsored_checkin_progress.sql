-- ============================================================
-- Check-in advances perk sponsored quests — the club↔clubber loop (circular
-- economy). Perk quests drive footfall (why the CLUB cares); check-in is the
-- proof. Coexists with content campaigns, split by `kind`. Fixes the bug where
-- an accepted perk quest ("Prvih 50 na vratima") never moved past 0.
-- ============================================================

ALTER TABLE public.sponsored_quests ADD COLUMN IF NOT EXISTS rule text NOT NULL DEFAULT 'checkin';
-- rule: 'checkin' (+1 per check-in) | 'checkin_early' (only if early-bird) | 'checkin_crew' (progress = crew size)

CREATE OR REPLACE FUNCTION public.advance_sponsored_on_checkin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_vname text; r record; v_prog record; v_new int;
BEGIN
  SELECT name INTO v_vname FROM public.venues WHERE id = NEW.venue_id;
  IF v_vname IS NULL THEN RETURN NEW; END IF;

  FOR r IN
    SELECT id, target_count, COALESCE(rule,'checkin') AS rule
    FROM public.sponsored_quests
    WHERE is_active AND COALESCE(kind,'perk') = 'perk'
      AND lower(btrim(venue_name)) = lower(btrim(v_vname))
  LOOP
    SELECT id, progress, completed INTO v_prog
    FROM public.sponsored_quest_progress
    WHERE user_id = NEW.user_id AND sponsored_quest_id = r.id;

    -- only advance quests the user has ACCEPTED (opt-in), not yet completed
    IF v_prog.id IS NULL OR v_prog.completed THEN CONTINUE; END IF;

    IF r.rule = 'checkin_early' THEN
      v_new := v_prog.progress + CASE WHEN NEW.early_bird THEN 1 ELSE 0 END;
    ELSIF r.rule = 'checkin_crew' THEN
      v_new := GREATEST(v_prog.progress, COALESCE(NEW.crew_size, 1));
    ELSE
      v_new := v_prog.progress + 1;
    END IF;

    UPDATE public.sponsored_quest_progress
    SET progress = v_new, completed = (v_new >= r.target_count)
    WHERE id = v_prog.id;
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_advance_sponsored ON public.venue_checkins;
CREATE TRIGGER trg_advance_sponsored
  AFTER INSERT ON public.venue_checkins
  FOR EACH ROW EXECUTE FUNCTION public.advance_sponsored_on_checkin();

-- founder sets the rule per perk quest
DROP FUNCTION IF EXISTS public.admin_save_sponsored(uuid, text, text, text, text, text, int, int, text, boolean, text, text);
CREATE OR REPLACE FUNCTION public.admin_save_sponsored(
  p_id uuid, p_venue_name text, p_logo text, p_title text, p_description text,
  p_reward_label text, p_target int, p_xp int, p_spots_label text, p_active boolean,
  p_kind text DEFAULT 'perk', p_media text DEFAULT 'photo', p_rule text DEFAULT 'checkin'
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF coalesce(btrim(p_title), '') = '' THEN RAISE EXCEPTION 'Title required'; END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.sponsored_quests (code, venue_name, logo, title, description, reward_label, target_count, xp_reward, spots_label, is_active, sort, kind, media, rule)
    VALUES ('c_' || substr(md5(random()::text || clock_timestamp()::text), 1, 10), p_venue_name, coalesce(p_logo,'⭐'), p_title, p_description, p_reward_label, GREATEST(coalesce(p_target,1),1), GREATEST(coalesce(p_xp,0),0), p_spots_label, coalesce(p_active,true), 100, coalesce(p_kind,'perk'), coalesce(p_media,'photo'), coalesce(p_rule,'checkin'))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.sponsored_quests
    SET venue_name=p_venue_name, logo=coalesce(p_logo,'⭐'), title=p_title, description=p_description,
        reward_label=p_reward_label, target_count=GREATEST(coalesce(p_target,1),1), xp_reward=GREATEST(coalesce(p_xp,0),0),
        spots_label=p_spots_label, is_active=coalesce(p_active,true), kind=coalesce(p_kind,'perk'), media=coalesce(p_media,'photo'), rule=coalesce(p_rule,'checkin')
    WHERE id=p_id RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_save_sponsored(uuid, text, text, text, text, text, int, int, text, boolean, text, text, text) TO authenticated;

-- set sensible rules on the existing perk seeds
UPDATE public.sponsored_quests SET rule='checkin_early' WHERE code='kult_first50';
UPDATE public.sponsored_quests SET rule='checkin'       WHERE code='bar25_before';
UPDATE public.sponsored_quests SET rule='checkin_crew'  WHERE code='para_crew';
