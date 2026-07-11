-- ============================================================
-- Seed Savamala venues (directory reference data). Founder request:
-- map the Savamala nightlife corridor. Sources: address data from Belgrade
-- nightlife guides (Karađorđeva / Braće Krsmanović strip) + Nixon (founder-
-- named). Coordinates are APPROXIMATE within the correct block — geofence is
-- OFF in beta (VITE_OPEN_CHECKIN), so this is fine for the heat map; verify
-- lat/lng on the ground before enabling production geofence.
-- Guarded by name so re-running is idempotent and won't duplicate.
-- ============================================================

INSERT INTO public.venues (name, slug, type, neighborhood, emoji, latitude, longitude)
SELECT v.name, v.slug, v.type, v.neighborhood, v.emoji, v.lat, v.lng
FROM (VALUES
  ('Hype',      'hype',      'club', 'Savamala', '🎧', 44.8138, 20.4522),  -- Karađorđeva 46
  ('Industrija','industrija','bar',  'Savamala', '🍸', 44.8148, 20.4535),  -- Karađorđeva 23
  ('Tranzit',   'tranzit',   'club', 'Savamala', '🎧', 44.8143, 20.4560),  -- Braće Krsmanović 8
  ('KC Grad',   'kc-grad',   'bar',  'Savamala', '🎨', 44.8145, 20.4558),  -- Braće Krsmanović 4 (kulturni centar)
  ('Nixon',     'nixon',     'club', 'Savamala', '🎧', 44.8140, 20.4530)   -- founder-named; confirm exact spot
) AS v(name, slug, type, neighborhood, emoji, lat, lng)
WHERE NOT EXISTS (
  SELECT 1 FROM public.venues e WHERE lower(e.name) = lower(v.name)
);
