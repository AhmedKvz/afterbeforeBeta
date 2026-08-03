-- LJUDI v1.1 (founder 2026-08-03): „maksimalno olakšaj spajanje".
-- 1) Match šalje notifikaciju DRUGOM korisniku (ne mora da bude u aplikaciji).
-- 2) chat_meet_context: da li smo OBOJE večeras na istom mestu → chat tada
--    nudi „igrice" za fizičko nalaženje (kod šanka, nosim tu boju…).
-- Softener prve poruke (po danu u nedelji) je čist klijent — bez novih podataka.

/* ── 1 · match → notifikacija drugom ── */
CREATE OR REPLACE FUNCTION public.meet_swipe(p_to uuid, p_mode text, p_like boolean)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v uuid := auth.uid();
  on_flag boolean;
  me_open boolean;
  they_open boolean;
  recent int;
  reciprocal boolean;
  v_cid uuid;
  partner record;
  my_name text;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_mode NOT IN ('dates', 'crew') THEN RAISE EXCEPTION 'BAD_MODE'; END IF;
  IF p_to = v THEN RAISE EXCEPTION 'SELF'; END IF;

  SELECT (value = 'true') INTO on_flag FROM public.app_settings WHERE key = 'meet_enabled';
  IF NOT COALESCE(on_flag, false) THEN RAISE EXCEPTION 'DISABLED'; END IF;

  SELECT CASE WHEN p_mode = 'dates' THEN COALESCE(open_dates, false) ELSE COALESCE(open_crew, false) END
    INTO me_open FROM public.profiles WHERE user_id = v;
  IF NOT COALESCE(me_open, false) THEN RAISE EXCEPTION 'NOT_OPTED_IN'; END IF;

  SELECT CASE WHEN p_mode = 'dates' THEN COALESCE(open_dates, false) ELSE COALESCE(open_crew, false) END
    INTO they_open FROM public.profiles WHERE user_id = p_to;
  IF NOT COALESCE(they_open, false) THEN RAISE EXCEPTION 'TARGET_CLOSED'; END IF;

  IF EXISTS (SELECT 1 FROM public.blocks b
              WHERE (b.blocker_id = v AND b.blocked_id = p_to)
                 OR (b.blocker_id = p_to AND b.blocked_id = v)) THEN
    RAISE EXCEPTION 'BLOCKED';
  END IF;

  SELECT count(*) INTO recent FROM public.meet_swipes
    WHERE from_user = v AND mode = p_mode AND created_at > now() - interval '24 hours';
  IF recent >= 50 THEN RAISE EXCEPTION 'LIMIT_REACHED'; END IF;

  INSERT INTO public.meet_swipes (from_user, to_user, mode, liked)
    VALUES (v, p_to, p_mode, p_like)
    ON CONFLICT (from_user, to_user, mode)
    DO UPDATE SET liked = EXCLUDED.liked, created_at = now();

  IF NOT p_like THEN RETURN json_build_object('matched', false); END IF;

  SELECT EXISTS (SELECT 1 FROM public.meet_swipes
                  WHERE from_user = p_to AND to_user = v AND mode = p_mode AND liked)
    INTO reciprocal;
  IF NOT reciprocal THEN RETURN json_build_object('matched', false); END IF;

  v_cid := public.ensure_conversation(v, p_to);
  UPDATE public.conversations SET status = 'active' WHERE id = v_cid;
  SELECT user_id, display_name, avatar_url INTO partner
    FROM public.profiles WHERE user_id = p_to;
  SELECT display_name INTO my_name FROM public.profiles WHERE user_id = v;

  -- Drugi ne mora da bude u aplikaciji da bi saznao (founder: olakšaj spajanje).
  -- Onaj ko je swipe-ovao vidi proslavu odmah, pa njemu notifikacija ne treba.
  INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (p_to, 'match', 'Iskra je uzajamna ✦',
            COALESCE(my_name, 'Neko') || ' — otvorena je nit. Dogovorite se za izlazak.',
            json_build_object('conversation_id', v_cid, 'other_id', v, 'mode', p_mode)::jsonb);

  RETURN json_build_object(
    'matched', true,
    'conversation_id', v_cid,
    'partner', json_build_object('user_id', partner.user_id, 'name', partner.display_name, 'avatar', partner.avatar_url)
  );
END;$$;

/* ── 2 · jesmo li OBOJE večeras na istom mestu? ── */
-- Vraća mesto samo ako oba imaju check-in na ISTOM mestu u zadnjih 12h.
-- Klijent tada u chatu nudi „igrice" za nalaženje (jedan tap, telefon se vraća
-- u džep). Van tog slučaja vraća {together: false} — nikad ne izmišlja kontekst.
CREATE OR REPLACE FUNCTION public.chat_meet_context(p_other uuid)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := auth.uid(); r record;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT vn.id, vn.name INTO r
  FROM public.venue_checkins a
  JOIN public.venue_checkins b ON b.venue_id = a.venue_id
  JOIN public.venues vn ON vn.id = a.venue_id
  WHERE a.user_id = v AND b.user_id = p_other
    AND a.created_at > now() - interval '12 hours'
    AND b.created_at > now() - interval '12 hours'
  ORDER BY a.created_at DESC
  LIMIT 1;
  IF r.id IS NULL THEN RETURN json_build_object('together', false); END IF;
  RETURN json_build_object('together', true, 'venue_id', r.id, 'venue_name', r.name);
END;$$;

GRANT EXECUTE ON FUNCTION public.chat_meet_context(uuid) TO authenticated;
