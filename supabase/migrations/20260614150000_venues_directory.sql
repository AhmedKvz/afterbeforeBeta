-- Venue directory + "claim your profile" mechanic.
-- Pre-list partner clubs + all relevant Belgrade venues so owners can claim & activate.
-- Normalizes venue identity (events/presence still key by name = venues.name).

CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  type TEXT NOT NULL DEFAULT 'club',        -- club / splav / bar / gallery / cafe
  neighborhood TEXT,
  emoji TEXT DEFAULT '🎵',
  hue INTEGER NOT NULL DEFAULT 282,
  description TEXT,
  instagram TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  is_partner BOOLEAN NOT NULL DEFAULT false,
  claim_status TEXT NOT NULL DEFAULT 'unclaimed',  -- unclaimed / pending / claimed
  claimed_by UUID,
  verified BOOLEAN NOT NULL DEFAULT false,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads venues" ON public.venues FOR SELECT USING (true);

-- Directory with per-user claim state.
CREATE OR REPLACE FUNCTION public.get_venues()
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid();
BEGIN
  RETURN COALESCE((
    SELECT json_agg(v ORDER BY v.is_partner DESC, v.sort, v.name)
    FROM (
      SELECT id, name, slug, type, neighborhood, emoji, hue, description, instagram,
             is_partner, claim_status, verified,
             (claimed_by = v_user) AS is_mine
      FROM public.venues
    ) v
  ), '[]'::json);
END;
$$;

-- Claim a venue (request). Sets pending + claimed_by; verification is manual/admin.
CREATE OR REPLACE FUNCTION public.claim_venue(p_venue UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_status TEXT;
  v_by UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT claim_status, claimed_by INTO v_status, v_by FROM public.venues WHERE id = p_venue;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Venue not found'; END IF;
  IF v_status <> 'unclaimed' AND v_by <> v_user THEN
    RAISE EXCEPTION 'Venue already claimed';
  END IF;
  UPDATE public.venues SET claim_status = 'pending', claimed_by = v_user WHERE id = p_venue;
  RETURN json_build_object('claimed', true, 'status', 'pending');
END;
$$;

-- Admin/owner approves a claim (verify). Kept simple for beta.
CREATE OR REPLACE FUNCTION public.verify_venue_claim(p_venue UUID, p_approve BOOLEAN)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.venues
    SET claim_status = CASE WHEN p_approve THEN 'claimed' ELSE 'unclaimed' END,
        verified = p_approve,
        claimed_by = CASE WHEN p_approve THEN claimed_by ELSE NULL END
  WHERE id = p_venue;
  RETURN json_build_object('ok', true);
END;
$$;

-- ============================================================
-- Seed: partner clubs (flagged) + all relevant Belgrade venues
-- ============================================================
INSERT INTO public.venues (name, slug, type, neighborhood, emoji, hue, is_partner, sort, latitude, longitude, description) VALUES
  ('Kult',          'kult',          'club',    'Dorćol',        '🎵', 282, true,  1, 44.8225, 20.4612, 'Underground techno & alternative.'),
  ('Para Klub',     'para-klub',     'club',    'Savamala',      '🎵', 290, true,  2, 44.8121, 20.4490, 'House & techno, late nights.'),
  ('25 Bar',        '25-bar',        'bar',     'Centar',        '🍸', 38,  true,  3, 44.8140, 20.4612, 'Cocktail bar & DJ nights.'),
  ('Drugstore',     'drugstore',     'club',    'Savski venac',  '🎵', 276, true,  4, 44.8050, 20.4710, 'Industrial techno temple.'),
  ('Karmakoma',     'karmakoma',     'bar',     'Dorćol',        '🍸', 354, true,  5, 44.8235, 20.4620, 'Bar & dance floor, eclectic.'),
  ('Dvorištance',   'dvoristance',   'bar',     'Centar',        '🍸', 45,  false, 10, 44.8120, 20.4660, 'Courtyard bar, summer vibes.'),
  ('Gadost',        'gadost',        'club',    'Savamala',      '🎵', 300, false, 11, 44.8110, 20.4500, 'Raw alt club.'),
  ('KPTM',          'kptm',          'club',    'Novi Beograd',  '🎵', 268, false, 12, 44.8190, 20.4290, 'Big-room electronic.'),
  ('Mint Club',     'mint-club',     'club',    'Novi Beograd',  '🎵', 160, false, 13, 44.8170, 20.4320, 'Mainstream & house.'),
  ('Supermarket',   'supermarket',   'club',    'Centar',        '🎵', 200, false, 14, 44.8135, 20.4625, 'Concept club & events.'),
  ('Telma',         'telma',         'club',    'Dorćol',        '🎵', 320, false, 15, 44.8240, 20.4640, 'Alt electronic nights.'),
  ('Zaokret',       'zaokret',       'bar',     'Vračar',        '🍸', 30,  false, 16, 44.8030, 20.4760, 'Live music & bar.'),
  ('Galerija DOTS', 'galerija-dots', 'gallery', 'Dorćol',        '🖼️', 330, false, 17, 44.8228, 20.4655, 'Gallery & culture events.'),
  ('20/44',         '20-44',         'splav',   'Savsko',        '🚢', 205, false, 18, 44.8090, 20.4470, 'Iconic river club splav.'),
  ('Tube',          'tube',          'club',    'Centar',        '🎵', 285, false, 19, 44.8125, 20.4600, 'Underground bunker club.'),
  ('Brankow',       'brankow',       'club',    'Savamala',      '🎵', 295, false, 20, 44.8155, 20.4515, 'Riverside club under the bridge.'),
  ('Freestyler',    'freestyler',    'splav',   'Novi Beograd',  '🚢', 210, false, 21, 44.8085, 20.4350, 'Legendary party splav.'),
  ('Hangar',        'hangar',        'splav',   'Novi Beograd',  '🚢', 215, false, 22, 44.8080, 20.4360, 'Big river floating club.'),
  ('Apartman',      'apartman',      'bar',     'Centar',        '🍸', 40,  false, 23, 44.8130, 20.4610, 'Lounge bar & DJ sets.'),
  ('Polet',         'polet',         'bar',     'Vračar',        '🍸', 50,  false, 24, 44.8020, 20.4720, 'Neighborhood bar, indie nights.'),
  ('Ben Akiba',     'ben-akiba',     'bar',     'Centar',        '🍸', 35,  false, 25, 44.8128, 20.4595, 'Hidden cocktail spot.'),
  ('Kvaka 22',      'kvaka-22',      'club',    'Centar',        '🎵', 310, false, 26, 44.8118, 20.4605, 'DIY culture & alt club.'),
  ('Half',          'half',          'splav',   'Novi Beograd',  '🚢', 220, false, 27, 44.8075, 20.4380, 'Riverside dance splav.'),
  ('Berlin',        'berlin',        'bar',     'Dorćol',        '🍸', 42,  false, 28, 44.8232, 20.4630, 'Bar & small dancefloor.')
ON CONFLICT (name) DO NOTHING;

-- Mark the seeded venue auth accounts as verified claimants where they match (Drugstore/Karmakoma/Para/etc.)
-- (left to manual verify in beta; venue accounts already exist as club_venue profiles.)
