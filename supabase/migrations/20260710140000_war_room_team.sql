-- ============================================================
-- War Room v2 (founder direktiva 2026-07-13): od founder-only localStorage
-- igračke do timskog PM alata. Taskovi u bazi, članovi tima (PM/mentor)
-- dobijaju pristup, B1 pilot checklista postaje živ board.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.war_members (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',   -- pm | mentor | member
  added_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.war_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.war_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','done','blocked')),
  owner text,
  note text,
  sort int NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.war_tasks ENABLE ROW LEVEL SECURITY;

-- Član = founder ILI upisan u war_members.
CREATE OR REPLACE FUNCTION public.war_is_member()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public._is_founder() OR EXISTS (SELECT 1 FROM public.war_members WHERE user_id = auth.uid());
$$;

CREATE POLICY "war members read tasks"  ON public.war_tasks FOR SELECT USING (public.war_is_member());
CREATE POLICY "war members write tasks" ON public.war_tasks FOR ALL USING (public.war_is_member()) WITH CHECK (public.war_is_member());
CREATE POLICY "war members see roster"  ON public.war_members FOR SELECT USING (public.war_is_member());

-- Founder dodaje/uklanja članove po email-u (osoba mora imati nalog u appu).
CREATE OR REPLACE FUNCTION public.war_add_member(p_email text, p_role text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid;
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(btrim(p_email));
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Nema naloga sa tim email-om — osoba prvo mora da se registruje u app.'; END IF;
  INSERT INTO public.war_members (user_id, email, role)
  VALUES (v_uid, lower(btrim(p_email)), coalesce(nullif(p_role,''),'member'))
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  RETURN json_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.war_remove_member(p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._is_founder() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.war_members WHERE user_id = p_user;
END; $$;

GRANT EXECUTE ON FUNCTION public.war_is_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.war_add_member(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.war_remove_member(uuid) TO authenticated;
