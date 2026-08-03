-- LANDING PRIJAVE (HANDOFF-LANDING §2): forma na landingu prelazi sa demo na
-- živo. Raver ulazi pravo u aplikaciju — forma je za izvođače, vodiče, venue
-- i brendove. Poziva se ANON ključem sa javne strane, pa je sav pristup kroz
-- SECURITY DEFINER RPC (tabela je deny-all: niko ne može da čita prijave).

CREATE TABLE IF NOT EXISTS public.landing_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_signup_uniq ON public.landing_signups(email, role);
CREATE INDEX IF NOT EXISTS idx_landing_signup_when ON public.landing_signups(created_at DESC);
ALTER TABLE public.landing_signups ENABLE ROW LEVEL SECURITY;
-- RLS deny-all: nema policy → ni anon ni authenticated ne vide ništa direktno.

CREATE OR REPLACE FUNCTION public.landing_signup(p_email text, p_role text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; v_role text; recent int;
BEGIN
  v_email := lower(btrim(coalesce(p_email, '')));
  v_role  := lower(btrim(coalesce(p_role, '')));

  IF v_email !~ '^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$' THEN RAISE EXCEPTION 'BAD_EMAIL'; END IF;
  IF length(v_email) > 160 THEN RAISE EXCEPTION 'BAD_EMAIL'; END IF;
  IF v_role NOT IN ('raver','izvodjac','vodic','helper','venue','brend') THEN RAISE EXCEPTION 'BAD_ROLE'; END IF;

  -- rate limit po mejlu (anti-spam na javnoj formi)
  SELECT count(*) INTO recent FROM public.landing_signups
   WHERE email = v_email AND created_at > now() - interval '24 hours';
  IF recent >= 6 THEN RAISE EXCEPTION 'TOO_MANY'; END IF;

  IF EXISTS (SELECT 1 FROM public.landing_signups WHERE email = v_email AND role = v_role) THEN
    RETURN json_build_object('ok', true, 'already', true);
  END IF;

  INSERT INTO public.landing_signups (email, role) VALUES (v_email, v_role);
  RETURN json_build_object('ok', true, 'already', false);
END;$$;

-- founder-only pregled (War Room)
CREATE OR REPLACE FUNCTION public.admin_list_signups()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
    SELECT id, email, role, created_at FROM public.landing_signups
    ORDER BY created_at DESC LIMIT 50
  ) t), '[]'::json);
END;$$;

GRANT EXECUTE ON FUNCTION public.landing_signup(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_signups() TO authenticated;
