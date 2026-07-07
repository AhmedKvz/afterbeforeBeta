-- ============================================================
-- AFC ledger unify (GAPS F3 / ECONOMY F1).
-- State before: profiles.spendable_xp = AFC balance, profiles.xp = reputation,
-- afc_ledger = AFC txn log. Check-in credits AFC+ledger correctly; BUT quest
-- claims went through client awardXP() which only bumped `xp` — so contribution
-- via quests earned reputation but ZERO spendable AFC (loop broken), and the
-- client-side award was spoofable.
--
-- Fix: server-validated claim_quest() that credits XP (reputation) + AFC
-- (currency) + afc_ledger atomically. Also backfill set-times into the ledger.
-- ============================================================

-- 1. Secure quest claim — validates completion server-side, credits both currencies
CREATE OR REPLACE FUNCTION public.claim_quest(p_quest_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user   uuid := auth.uid();
  v_uq     uuid;
  v_reward int;
  v_bal    int;
  v_newbal int;
  v_newxp  int;
  v_level  int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;

  SELECT uq.id, q.xp_reward INTO v_uq, v_reward
  FROM public.user_quests uq
  JOIN public.quests q ON q.id = uq.quest_id
  WHERE uq.user_id = v_user AND uq.quest_id = p_quest_id
    AND uq.is_completed = true AND uq.xp_claimed = false
  ORDER BY uq.week_start DESC
  LIMIT 1
  FOR UPDATE;

  IF v_uq IS NULL THEN RAISE EXCEPTION 'Nothing to claim'; END IF;

  UPDATE public.user_quests SET xp_claimed = true WHERE id = v_uq;

  -- XP (reputation) + level
  INSERT INTO public.xp_transactions (user_id, amount, reason) VALUES (v_user, v_reward, 'Quest completed');
  UPDATE public.profiles SET xp = COALESCE(xp, 0) + v_reward WHERE user_id = v_user RETURNING xp INTO v_newxp;
  v_level := public.level_from_xp(v_newxp);
  UPDATE public.profiles SET level = v_level WHERE user_id = v_user;

  -- AFC (currency) + ledger
  SELECT COALESCE(spendable_xp, 0) INTO v_bal FROM public.profiles WHERE user_id = v_user;
  v_newbal := v_bal + v_reward;
  UPDATE public.profiles SET spendable_xp = v_newbal WHERE user_id = v_user;
  INSERT INTO public.afc_ledger (user_id, delta, reason, ref_type, ref_id, balance_after)
  VALUES (v_user, v_reward, 'quest', 'quest', p_quest_id, v_newbal);

  RETURN json_build_object('ok', true, 'xp', v_reward, 'afc', v_reward, 'afc_balance', v_newbal, 'level', v_level);
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_quest(uuid) TO authenticated;

-- 2. Backfill set-times AFC into the ledger (submit_set_times bumped spendable_xp
--    but skipped afc_ledger). Rewrite it to log consistently.
CREATE OR REPLACE FUNCTION public.submit_set_times(p_event uuid, p_times jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_owner uuid;
  v_award int := 60;
  v_first boolean;
  v_bal   int;
  v_newbal int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF jsonb_typeof(p_times) <> 'array' THEN RAISE EXCEPTION 'set_times must be an array'; END IF;

  SELECT set_times_by INTO v_owner FROM public.events WHERE id = p_event FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No such event'; END IF;
  IF v_owner IS NOT NULL AND v_owner <> v_user THEN
    RETURN json_build_object('ok', false, 'reason', 'already_set');
  END IF;

  v_first := (v_owner IS NULL);
  UPDATE public.events SET set_times = p_times, set_times_by = v_user WHERE id = p_event;

  IF v_first THEN
    INSERT INTO public.xp_transactions (user_id, amount, reason) VALUES (v_user, v_award, 'Submitted set times');
    UPDATE public.profiles SET xp = xp + v_award WHERE user_id = v_user;
    SELECT COALESCE(spendable_xp, 0) INTO v_bal FROM public.profiles WHERE user_id = v_user;
    v_newbal := v_bal + v_award;
    UPDATE public.profiles SET spendable_xp = v_newbal WHERE user_id = v_user;
    INSERT INTO public.afc_ledger (user_id, delta, reason, ref_type, ref_id, balance_after)
    VALUES (v_user, v_award, 'set_times', 'event', p_event, v_newbal);
  END IF;

  RETURN json_build_object('ok', true, 'awarded', CASE WHEN v_first THEN v_award ELSE 0 END);
END;
$$;

-- 3. Catalog v0 — Serbian + partner-aligned (cost_xp column IS the AFC cost)
UPDATE public.rewards SET title='Piće na račun kuće', sub='Kod partnera na check-in'      WHERE code='free_drink';
UPDATE public.rewards SET title='Preskoči red',        sub='Jedan ulaz, bez čekanja'       WHERE code='skip_line';
UPDATE public.rewards SET title='3 uvida „ko je tu"',   sub='Otključaj prisustvo ×3'        WHERE code='peeks_3';
UPDATE public.rewards SET title='−50% na kartu',        sub='Izabrani događaji ove nedelje' WHERE code='ticket_50';
UPDATE public.rewards SET title='AfterBefore+ · nedelja', sub='Neograničeni uvidi + prioritet' WHERE code='plus_week';
UPDATE public.rewards SET title='Flaša −20%',           sub='Kult i Para Klub'              WHERE code='bottle_20';
