-- ═══════════════════════════════════════════════════════════════════════════
-- SCENA: profili umetnika (DJ / tattoo / vizuelni / foto / VJ)
-- Odluka 2026-08-08: umetnici = distribucija i sadržaj, NE transakcije.
-- Booking/cene/poruke ka umetniku NE postoje (Phase 2, legal-first).
-- AMBASADOR bedž dodeljuje founder ručno (kurirana mreža, kao founding raver).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1 · profiles: novi account_type 'artist' + pod-tip + bedž
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_type_check
  CHECK (account_type IN ('party_goer', 'club_venue', 'artist'));
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS artist_type text
    CHECK (artist_type IN ('dj', 'tattoo', 'visual', 'photo', 'vj', 'other')),
  ADD COLUMN IF NOT EXISTS is_ambassador boolean NOT NULL DEFAULT false;

-- 2 · event_artists: umetnik ↔ event (timetable = nadolazeći eventi, automatski)
CREATE TABLE IF NOT EXISTS public.event_artists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  artist_id  uuid NOT NULL,  -- profiles.user_id umetnika
  role       text NOT NULL DEFAULT 'performer',  -- performer | guest | popup (tattoo gostovanje)
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, artist_id)
);
CREATE INDEX IF NOT EXISTS idx_event_artists_artist ON public.event_artists(artist_id);
ALTER TABLE public.event_artists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ea_read ON public.event_artists;
CREATE POLICY ea_read ON public.event_artists FOR SELECT USING (true);
-- vezivanje na event: sam umetnik za sebe (founder/venue kroz War Room = service role)
DROP POLICY IF EXISTS ea_write_own ON public.event_artists;
CREATE POLICY ea_write_own ON public.event_artists FOR ALL
  USING (artist_id = auth.uid()) WITH CHECK (artist_id = auth.uid());

-- 3 · artist_follows: follow = distribucioni kanal (#49)
CREATE TABLE IF NOT EXISTS public.artist_follows (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  artist_id  uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, artist_id)
);
CREATE INDEX IF NOT EXISTS idx_artist_follows_artist ON public.artist_follows(artist_id);
ALTER TABLE public.artist_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS af_read ON public.artist_follows;
CREATE POLICY af_read ON public.artist_follows FOR SELECT USING (true); -- broj pratilaca je javan/socijalan
DROP POLICY IF EXISTS af_write_own ON public.artist_follows;
CREATE POLICY af_write_own ON public.artist_follows FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4 · artist_gallery: portfolio (radovi za tattoo/vizuelne, atmosfera za DJ-eve)
CREATE TABLE IF NOT EXISTS public.artist_gallery (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id  uuid NOT NULL,
  image_url  text NOT NULL,
  caption    text,
  position   int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_artist_gallery_artist ON public.artist_gallery(artist_id, position);
ALTER TABLE public.artist_gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ag_read ON public.artist_gallery;
CREATE POLICY ag_read ON public.artist_gallery FOR SELECT USING (true);
DROP POLICY IF EXISTS ag_write_own ON public.artist_gallery;
CREATE POLICY ag_write_own ON public.artist_gallery FOR ALL
  USING (artist_id = auth.uid()) WITH CHECK (artist_id = auth.uid());
