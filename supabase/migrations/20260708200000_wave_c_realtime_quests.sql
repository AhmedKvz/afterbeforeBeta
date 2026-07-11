-- ============================================================
-- Wave C: realtime instead of polling + server-side weekly quest assignment.
-- (ultra-review C1/C4 + stability #5/#6)
-- ============================================================

-- 1. Crew realtime: members may SELECT their crew's messages/members (needed
--    for postgres_changes — realtime respects RLS). Writes stay RPC-only.
CREATE POLICY "members read crew messages" ON public.crew_messages
  FOR SELECT USING (public._in_crew(crew_id, auth.uid()));
CREATE POLICY "members read crew members" ON public.crew_members
  FOR SELECT USING (public._in_crew(crew_id, auth.uid()));

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.crew_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.crew_members;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Weekly quest assignment moves server-side: idempotent, race-safe
--    (was an insert inside a client useQuery — double-fire + races).
CREATE OR REPLACE FUNCTION public.assign_weekly_quests()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_week date := (date_trunc('week', (now() AT TIME ZONE 'Europe/Belgrade')::timestamp))::date;
  v_have int;
  v_added int := 0;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;

  SELECT count(*) INTO v_have
  FROM public.user_quests uq
  JOIN public.quests q ON q.id = uq.quest_id AND q.is_active
  WHERE uq.user_id = v_user AND uq.week_start = v_week;

  IF v_have < 5 THEN
    INSERT INTO public.user_quests (user_id, quest_id, week_start, progress, is_completed, xp_claimed)
    SELECT v_user, q.id, v_week, 0, false, false
    FROM public.quests q
    WHERE q.is_active
      AND NOT EXISTS (SELECT 1 FROM public.user_quests x
                      WHERE x.user_id = v_user AND x.quest_id = q.id AND x.week_start = v_week)
    ORDER BY random()
    LIMIT (5 - v_have)
    ON CONFLICT (user_id, quest_id, week_start) DO NOTHING;
    GET DIAGNOSTICS v_added = ROW_COUNT;
  END IF;

  RETURN json_build_object('week', v_week, 'added', v_added);
END; $$;
GRANT EXECUTE ON FUNCTION public.assign_weekly_quests() TO authenticated;

-- 3. Anti-spoof: clients could set user_quests.is_completed=true directly and
--    then claim_quest would pay out. Normalize server-side: is_completed is
--    always derived from progress vs target, and a claimed quest can never be
--    un-claimed (re-claim protection).
CREATE OR REPLACE FUNCTION public.user_quests_normalize()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_target int;
BEGIN
  SELECT target_count INTO v_target FROM public.quests WHERE id = NEW.quest_id;
  NEW.progress := GREATEST(COALESCE(NEW.progress, 0), 0);
  NEW.is_completed := (v_target IS NOT NULL AND NEW.progress >= v_target);
  IF TG_OP = 'UPDATE' AND OLD.xp_claimed AND NOT NEW.xp_claimed THEN
    NEW.xp_claimed := true;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_user_quests_normalize ON public.user_quests;
CREATE TRIGGER trg_user_quests_normalize
  BEFORE INSERT OR UPDATE ON public.user_quests
  FOR EACH ROW EXECUTE FUNCTION public.user_quests_normalize();
