-- ============================================================
-- Set times (satnica) — the #1 clubber ask (GAPS/KLABER #47).
-- Crowdsourced: first person inside enters when each act plays,
-- earns AFC. First-submitter wins; only they can edit.
-- ============================================================

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS set_times jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS set_times_by uuid;

-- shape: [{"artist":"MAGLA","time":"02:30"}, ...]  (time = local HH:MM)
CREATE OR REPLACE FUNCTION public.submit_set_times(p_event uuid, p_times jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user     uuid := auth.uid();
  v_owner    uuid;
  v_award    int  := 60;
  v_first    boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF jsonb_typeof(p_times) <> 'array' THEN RAISE EXCEPTION 'set_times must be an array'; END IF;

  SELECT set_times_by INTO v_owner FROM public.events WHERE id = p_event FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No such event'; END IF;

  -- first submitter wins; only the owner may edit afterwards
  IF v_owner IS NOT NULL AND v_owner <> v_user THEN
    RETURN json_build_object('ok', false, 'reason', 'already_set');
  END IF;

  v_first := (v_owner IS NULL);
  UPDATE public.events SET set_times = p_times, set_times_by = v_user WHERE id = p_event;

  -- award AFC/XP only on the first (creating) submission, not edits
  IF v_first THEN
    INSERT INTO public.xp_transactions (user_id, amount, reason)
    VALUES (v_user, v_award, 'Submitted set times');
    UPDATE public.profiles
    SET xp = xp + v_award, spendable_xp = COALESCE(spendable_xp, 0) + v_award
    WHERE user_id = v_user;
  END IF;

  RETURN json_build_object('ok', true, 'awarded', CASE WHEN v_first THEN v_award ELSE 0 END);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_set_times(uuid, jsonb) TO authenticated;
