-- ============================================================
-- Onboarding v2 prefs — stated preferences that seed personalization
-- (and, grant-phase, the AI Intelligence Layer context: user preferences,
-- crew availability). crew_intent: 'nadji-mi-ekipu' | 'imam-ekipu' | 'zavisi'.
-- fav_venues: venue names picked in the "šta bi posetio" step.
-- NOTE: economy lockdown uses column-level UPDATE grants — new profile
-- columns MUST be granted explicitly or client writes fail.
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS crew_intent text,
  ADD COLUMN IF NOT EXISTS fav_venues text[] DEFAULT '{}';

GRANT UPDATE (crew_intent, fav_venues) ON public.profiles TO authenticated;
