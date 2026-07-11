-- ============================================================
-- SECURITY: lock down the economy (ultra-review CRIT #1 and #2).
-- Before this: the permissive `profiles` UPDATE policy let any user set their
-- own spendable_xp / xp / level / is_founding_raver from devtools, and the
-- xp_transactions INSERT policy let clients mint reputation via awardXP().
-- SECURITY DEFINER RPCs are unaffected by these grants (they run as owner) —
-- all legitimate awards already flow through them.
-- ============================================================

-- 1. Column-level UPDATE grant on profiles: everything EXCEPT economy/status
--    columns (xp, spendable_xp, level, is_founding_raver, founding_raver_number,
--    is_verified, instagram_verified, referral_code, referred_by) and identity
--    (id, user_id, created_at).
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;
GRANT UPDATE (
  display_name, age, city, avatar_url, bio, music_preferences,
  events_attended, total_matches, onboarding_completed, updated_at,
  account_type, venue_name, venue_address, venue_description, venue_logo_url,
  venue_capacity, venue_music_genres, venue_instagram, venue_contact_phone,
  venue_type, neighborhood, instagram_handle, instagram_followers,
  instagram_avatar_url, sparks_enabled
) ON public.profiles TO authenticated;

-- 2. Clients may no longer insert XP transactions directly (awardXP mint path).
DROP POLICY IF EXISTS "xp_insert" ON public.xp_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.xp_transactions;
REVOKE INSERT ON public.xp_transactions FROM authenticated;

-- 3. Harden check-in triggers: ancillary progress must NEVER abort the money
--    path (ultra-review HIGH #3). Both triggers get exception isolation.
CREATE OR REPLACE FUNCTION public.advance_sponsored_on_checkin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_vname text; r record; v_prog record; v_new int;
BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW; -- never block a check-in over quest bookkeeping
  END;
  RETURN NEW;
END; $$;

-- 4. Double check-in race guard (ultra-review MED #10): one check-in per
--    user+venue+night, enforced atomically. Uses the nightlife night (pre-6am
--    belongs to the previous day) via an immutable helper.
CREATE OR REPLACE FUNCTION public.nightlife_date_of(ts timestamptz)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN EXTRACT(HOUR FROM ts AT TIME ZONE 'Europe/Belgrade') < 6
    THEN (ts AT TIME ZONE 'Europe/Belgrade')::date - 1
    ELSE (ts AT TIME ZONE 'Europe/Belgrade')::date END;
$$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_checkin_user_venue_night
  ON public.venue_checkins (user_id, venue_id, public.nightlife_date_of(created_at));

-- 5. Campaign submission spam guard (ultra-review MED #8): one entry per user
--    per campaign (edit = replace, keep simple for beta).
CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_submission_user
  ON public.campaign_submissions (sponsored_id, user_id);
