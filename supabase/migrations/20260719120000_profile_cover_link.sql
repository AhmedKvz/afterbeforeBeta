-- Profil kao vibe card v2: cover slika + lični link (bio već postoji).
-- Klijent piše direktno u svoj red (RLS: user_id = auth.uid()), pa nove
-- kolone MORAJU dobiti column-level GRANT (pravilo iz onboarding_prefs).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS link_url text;

GRANT UPDATE (cover_url, link_url) ON public.profiles TO authenticated;
