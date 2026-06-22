-- Weekend Shield: 1 missed weekend per month doesn't break the streak.
-- Duolingo-proven mechanic: +40% 7-day streak retention.
-- AfterBefore variant: shield fires when missed gap includes Fri/Sat (nightlife nights).

-- ── 1. Track which calendar month the shield was consumed ────────────────────
ALTER TABLE public.user_streaks
  ADD COLUMN IF NOT EXISTS shield_month TEXT,          -- 'YYYY-MM' of last shield use; NULL = never used
  ADD COLUMN IF NOT EXISTS shield_saved_at TIMESTAMPTZ; -- when shield last fired (for analytics)

-- ── 2. Updated claim_daily_streak() with Weekend Shield logic ────────────────
CREATE OR REPLACE FUNCTION public.claim_daily_streak()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user            UUID    := auth.uid();
  v_today           DATE    := current_date;
  v_last            DATE;
  v_cur             INTEGER;
  v_new             INTEGER;
  v_xp              INTEGER;
  v_shield_month    TEXT;
  v_shield_used     BOOLEAN := false;
  v_gap             INTEGER;
  v_cur_month       TEXT    := to_char(v_today, 'YYYY-MM');
  v_gap_has_weekend BOOLEAN := false;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT last_claim_date, current_streak, shield_month
  INTO v_last, v_cur, v_shield_month
  FROM public.user_streaks WHERE user_id = v_user;

  -- Already claimed today
  IF v_last = v_today THEN
    RETURN json_build_object(
      'already_claimed',  true,
      'current_streak',   COALESCE(v_cur, 0),
      'shield_available', (v_shield_month IS NULL OR v_shield_month != v_cur_month)
    );
  END IF;

  v_gap := COALESCE((v_today - v_last)::int, 999);

  IF v_gap = 1 THEN
    -- Consecutive day: streak continues normally
    v_new := COALESCE(v_cur, 0) + 1;

  ELSIF v_gap BETWEEN 2 AND 14 THEN
    -- Gap: check if any missed day was Friday (DOW=5) or Saturday (DOW=6)
    SELECT EXISTS (
      SELECT 1
      FROM generate_series(
             (v_last + 1)::timestamp,
             (v_today - 1)::timestamp,
             '1 day'::interval
           ) AS d
      WHERE EXTRACT(DOW FROM d) IN (5, 6)
    ) INTO v_gap_has_weekend;

    IF v_gap_has_weekend AND (v_shield_month IS NULL OR v_shield_month != v_cur_month) THEN
      -- Shield saves it!
      v_new        := COALESCE(v_cur, 0) + 1;
      v_shield_used := true;
    ELSE
      v_new := 1;
    END IF;

  ELSE
    -- Gap > 14 days: no mercy, reset
    v_new := 1;
  END IF;

  -- XP: 25 base + 75 bonus on every 7th day
  v_xp := 25 + CASE WHEN v_new % 7 = 0 THEN 75 ELSE 0 END;

  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_claim_date, shield_month, shield_saved_at)
  VALUES (v_user, v_new, v_new, v_today,
    CASE WHEN v_shield_used THEN v_cur_month ELSE NULL END,
    CASE WHEN v_shield_used THEN now()       ELSE NULL END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak  = v_new,
    longest_streak  = GREATEST(public.user_streaks.longest_streak, v_new),
    last_claim_date = v_today,
    shield_month    = CASE WHEN v_shield_used THEN v_cur_month ELSE public.user_streaks.shield_month END,
    shield_saved_at = CASE WHEN v_shield_used THEN now()       ELSE public.user_streaks.shield_saved_at END;

  INSERT INTO public.streak_claims (user_id, claim_date, xp)
  VALUES (v_user, v_today, v_xp)
  ON CONFLICT (user_id, claim_date) DO NOTHING;

  INSERT INTO public.xp_transactions (user_id, amount, reason)
  VALUES (v_user, v_xp, 'Daily streak');

  UPDATE public.profiles
  SET xp           = COALESCE(xp, 0) + v_xp,
      spendable_xp = COALESCE(spendable_xp, 0) + v_xp
  WHERE user_id = v_user;

  RETURN json_build_object(
    'claimed',          true,
    'current_streak',   v_new,
    'xp',               v_xp,
    'shield_used',      v_shield_used,
    'shield_available', NOT v_shield_used AND (v_shield_month IS NULL OR v_shield_month != v_cur_month)
  );
END;
$$;

-- ── 3. Lightweight RPC to read shield status without claiming ─────────────────
CREATE OR REPLACE FUNCTION public.get_streak_shield()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  UUID := auth.uid();
  v_rec   RECORD;
  v_month TEXT := to_char(current_date, 'YYYY-MM');
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT current_streak, longest_streak, last_claim_date, shield_month, shield_saved_at
  INTO v_rec
  FROM public.user_streaks WHERE user_id = v_user;

  RETURN json_build_object(
    'current_streak',   COALESCE(v_rec.current_streak, 0),
    'longest_streak',   COALESCE(v_rec.longest_streak, 0),
    'last_claim_date',  v_rec.last_claim_date,
    'shield_available', (v_rec.shield_month IS NULL OR v_rec.shield_month != v_month),
    'shield_month',     v_rec.shield_month,
    'shield_saved_at',  v_rec.shield_saved_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_streak_shield() TO authenticated;
