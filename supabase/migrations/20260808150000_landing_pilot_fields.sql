-- ═══════════════════════════════════════════════════════════════════════════
-- Landing pilot forma: naziv prostora / grad / kontakt osoba se do sada NISU
-- upisivali (RPC je primao samo email+role — lead je stizao krnji).
-- Stari 2-arg poziv OSTAJE da radi (default NULL) — živi landing ne puca
-- ni pre ni posle deploja nove forme.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.landing_signups
  ADD COLUMN IF NOT EXISTS venue_name   text,
  ADD COLUMN IF NOT EXISTS city         text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS venue_type   text;

CREATE OR REPLACE FUNCTION public.landing_signup(
  p_email text, p_role text,
  p_venue_name text DEFAULT NULL, p_city text DEFAULT NULL,
  p_contact_name text DEFAULT NULL, p_venue_type text DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; v_role text; recent int;
BEGIN
  v_email := lower(btrim(coalesce(p_email, '')));
  v_role  := lower(btrim(coalesce(p_role, '')));

  IF v_email !~ '^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$' THEN RAISE EXCEPTION 'BAD_EMAIL'; END IF;
  IF length(v_email) > 160 THEN RAISE EXCEPTION 'BAD_EMAIL'; END IF;
  IF v_role NOT IN ('raver','izvodjac','vodic','helper','venue','brend') THEN RAISE EXCEPTION 'BAD_ROLE'; END IF;

  SELECT count(*) INTO recent FROM public.landing_signups
   WHERE email = v_email AND created_at > now() - interval '24 hours';
  IF recent >= 6 THEN RAISE EXCEPTION 'TOO_MANY'; END IF;

  IF EXISTS (SELECT 1 FROM public.landing_signups WHERE email = v_email AND role = v_role) THEN
    -- postojeći lead: dopuni pilot polja ako su sada stigla (ne gubi podatke)
    UPDATE public.landing_signups SET
      venue_name   = coalesce(nullif(left(btrim(p_venue_name), 120), ''), venue_name),
      city         = coalesce(nullif(left(btrim(p_city), 80), ''), city),
      contact_name = coalesce(nullif(left(btrim(p_contact_name), 120), ''), contact_name),
      venue_type   = coalesce(nullif(left(btrim(p_venue_type), 40), ''), venue_type)
    WHERE email = v_email AND role = v_role;
    RETURN json_build_object('ok', true, 'already', true);
  END IF;

  INSERT INTO public.landing_signups (email, role, venue_name, city, contact_name, venue_type)
  VALUES (v_email, v_role,
          nullif(left(btrim(p_venue_name), 120), ''), nullif(left(btrim(p_city), 80), ''),
          nullif(left(btrim(p_contact_name), 120), ''), nullif(left(btrim(p_venue_type), 40), ''));
  RETURN json_build_object('ok', true, 'already', false);
END;$$;

-- stari 2-arg potpis nestaje (CREATE OR REPLACE sa novim default-ima ga menja);
-- grant ide na novi potpis, anon mora da može (javna forma)
GRANT EXECUTE ON FUNCTION public.landing_signup(text, text, text, text, text, text) TO anon, authenticated;

-- ⚠️ Naučeno pri primeni (2026-08-08): CREATE OR REPLACE sa novim potpisom NE
-- menja stari — pravi PREOPTEREĆENJE, a PostgREST tada odbija 2-arg poziv
-- (PGRST203 dvosmislenost) → živa forma pukne. Stari potpis mora eksplicitno
-- da se obriše + reload šeme:
DROP FUNCTION IF EXISTS public.landing_signup(text, text);
NOTIFY pgrst, 'reload schema';
