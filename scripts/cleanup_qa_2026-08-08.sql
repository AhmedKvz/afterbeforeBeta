-- Jednokratno čišćenje QA naloga iz istrage registracije (2026-08-04).
-- Briše SAMO naloge sa qa.* @primer.rs mejlovima — ništa drugo.
-- Prvo pogledaj šta hvata, pa obriši u istoj transakciji.
DO $$
DECLARE ids uuid[];
BEGIN
  SELECT array_agg(id) INTO ids FROM auth.users
   WHERE email ~ '^qa\.(reg|reg5|ui)\.\d+@primer\.rs$';
  IF ids IS NULL THEN RAISE NOTICE 'QA nalozi: nema (već očišćeno)'; RETURN; END IF;
  RAISE NOTICE 'Brišem % QA naloga: %', array_length(ids,1), ids;

  DELETE FROM public.venue_checkins  WHERE user_id = ANY(ids);
  DELETE FROM public.venue_intent    WHERE user_id = ANY(ids);
  DELETE FROM public.analytics_events WHERE user_id = ANY(ids);
  DELETE FROM public.profiles        WHERE user_id = ANY(ids);
  DELETE FROM auth.users             WHERE id = ANY(ids);
END $$;

-- Kontrola posle: koliko je ostalo profila / check-inova
SELECT (SELECT count(*) FROM public.profiles)       AS profili,
       (SELECT count(*) FROM public.venue_checkins) AS checkini,
       (SELECT count(*) FROM auth.users WHERE email LIKE 'qa.%') AS qa_ostalo;
