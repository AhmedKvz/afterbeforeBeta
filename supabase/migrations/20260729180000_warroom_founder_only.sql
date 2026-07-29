-- WAR ROOM — SAMO FOUNDER (founder odluka 2026-07-29).
-- Ranije: founder + war_members (PM/mentor koncept, nikad korišćen — 0 redova).
-- Sada: war_is_member() vraća isto što i _is_founder(), pa i STARI klijenti i
-- direktni RPC pozivi ostaju zaključani (defense in depth). Tabela war_members
-- ostaje kao spisak kontakata u PLAN tabu, ali NE daje nikakav pristup.

CREATE OR REPLACE FUNCTION public.war_is_member()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public._is_founder();
$$;
