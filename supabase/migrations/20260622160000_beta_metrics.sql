-- Beta metrics RPC for the Smart Start grant dashboard.
-- Key metric: "X% of users who came one weekend returned the next."
-- Access: admin-only (is_founding_raver = true or specific role).

CREATE OR REPLACE FUNCTION public.get_beta_metrics()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user              UUID := auth.uid();
  v_total_users       INT;
  v_activated         INT;  -- checked in at least once
  v_checkins_total    INT;
  v_checkins_7d       INT;
  v_signups_7d        INT;
  v_founding_ravers   INT;
  v_active_streaks    INT;
  v_avg_streak        NUMERIC;
  v_nps_total         INT;
  v_nps_yes           INT;
  v_nps_maybe         INT;
  v_nps_no            INT;
  v_cohort_size       INT;
  v_retained          INT;
  v_retention_pct     NUMERIC;
  v_checkins_by_dow   JSON;
BEGIN
  -- Gate: only founding ravers / admins can see this
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user AND is_founding_raver = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- ── Users ──────────────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_total_users
  FROM public.profiles WHERE account_type = 'party_goer';

  SELECT COUNT(DISTINCT user_id) INTO v_activated
  FROM public.venue_checkins;

  SELECT COUNT(*) INTO v_signups_7d
  FROM public.profiles
  WHERE account_type = 'party_goer' AND created_at >= now() - interval '7 days';

  SELECT COUNT(*) INTO v_founding_ravers
  FROM public.profiles WHERE is_founding_raver = true;

  -- ── Check-ins ──────────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_checkins_total FROM public.venue_checkins;

  SELECT COUNT(*) INTO v_checkins_7d
  FROM public.venue_checkins WHERE created_at >= now() - interval '7 days';

  -- Check-ins by day of week (0=Sun … 6=Sat)
  SELECT json_object_agg(dow, cnt ORDER BY dow) INTO v_checkins_by_dow
  FROM (
    SELECT EXTRACT(DOW FROM created_at)::int AS dow, COUNT(*) AS cnt
    FROM public.venue_checkins
    GROUP BY 1
  ) t;

  -- ── Streaks ────────────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_active_streaks
  FROM public.user_streaks WHERE current_streak > 0;

  SELECT ROUND(AVG(current_streak), 1) INTO v_avg_streak
  FROM public.user_streaks WHERE current_streak > 0;

  -- ── NPS ────────────────────────────────────────────────────────────────────
  SELECT
    COUNT(*)                                         INTO v_nps_total
  FROM public.checkin_feedback WHERE question = 'nps_recommend';

  SELECT COUNT(*) INTO v_nps_yes
  FROM public.checkin_feedback WHERE question = 'nps_recommend' AND score = 5;

  SELECT COUNT(*) INTO v_nps_maybe
  FROM public.checkin_feedback WHERE question = 'nps_recommend' AND score = 3;

  SELECT COUNT(*) INTO v_nps_no
  FROM public.checkin_feedback WHERE question = 'nps_recommend' AND score = 1;

  -- ── Weekend retention cohort ────────────────────────────────────────────────
  -- weekend = Fri (5) or Sat (6) or Sun (0) check-in
  -- cohort_size = users who checked in on ANY weekend
  -- retained    = of those, who checked in on a SECOND distinct weekend
  WITH weekend_ci AS (
    SELECT DISTINCT
      user_id,
      -- clamp Fri+Sat+Sun to same "weekend week" by advancing Sun to Mon's week
      CASE WHEN EXTRACT(DOW FROM created_at) = 0
           THEN date_trunc('week', created_at - interval '1 day')::date
           ELSE date_trunc('week', created_at)::date
      END AS wk
    FROM public.venue_checkins
    WHERE EXTRACT(DOW FROM created_at) IN (0, 5, 6)
  ),
  first_wk AS (
    SELECT user_id, MIN(wk) AS first_weekend
    FROM weekend_ci GROUP BY user_id
  ),
  retained_users AS (
    SELECT DISTINCT fw.user_id
    FROM first_wk fw
    JOIN weekend_ci wc ON wc.user_id = fw.user_id AND wc.wk > fw.first_weekend
  )
  SELECT
    COUNT(DISTINCT fw.user_id),
    COUNT(DISTINCT ru.user_id)
  INTO v_cohort_size, v_retained
  FROM first_wk fw
  LEFT JOIN retained_users ru ON ru.user_id = fw.user_id;

  v_retention_pct := CASE
    WHEN v_cohort_size = 0 THEN 0
    ELSE ROUND(v_retained * 100.0 / v_cohort_size, 1)
  END;

  RETURN json_build_object(
    -- Users
    'total_users',        v_total_users,
    'activated_users',    v_activated,
    'activation_pct',     CASE WHEN v_total_users = 0 THEN 0 ELSE ROUND(v_activated * 100.0 / v_total_users, 1) END,
    'signups_7d',         v_signups_7d,
    'founding_ravers',    v_founding_ravers,
    -- Check-ins
    'checkins_total',     v_checkins_total,
    'checkins_7d',        v_checkins_7d,
    'checkins_by_dow',    COALESCE(v_checkins_by_dow, '{}'::json),
    -- Streaks
    'active_streaks',     v_active_streaks,
    'avg_streak',         COALESCE(v_avg_streak, 0),
    -- NPS
    'nps_total',          v_nps_total,
    'nps_yes',            v_nps_yes,
    'nps_maybe',          v_nps_maybe,
    'nps_no',             v_nps_no,
    'nps_pct',            CASE WHEN v_nps_total = 0 THEN 0 ELSE ROUND(v_nps_yes * 100.0 / v_nps_total, 1) END,
    -- Retention cohort
    'weekend_cohort',     v_cohort_size,
    'weekend_retained',   v_retained,
    'weekend_retention',  v_retention_pct
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_beta_metrics() TO authenticated;
