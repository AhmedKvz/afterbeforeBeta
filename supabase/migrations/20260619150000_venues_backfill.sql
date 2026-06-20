-- Phase 1 of venue-model unification: make `venues` the canonical source.
-- Backfill every venue that appears anywhere (club_venue profiles + events) into `venues`,
-- with coordinates pulled from events. Idempotent (ON CONFLICT name DO NOTHING).

-- emoji by type helper inline via CASE; hue from name hash.

-- 1) from club_venue profiles (carry metadata)
INSERT INTO public.venues (name, type, neighborhood, instagram, description, emoji, hue, latitude, longitude, sort)
SELECT p.venue_name,
       COALESCE(p.venue_type, 'club'),
       p.neighborhood,
       p.venue_instagram,
       p.venue_description,
       CASE COALESCE(p.venue_type,'club') WHEN 'splav' THEN '🚢' WHEN 'bar' THEN '🍸' WHEN 'gallery' THEN '🖼️' WHEN 'cafe' THEN '☕' ELSE '🎵' END,
       (abs(hashtext(p.venue_name)) % 360),
       ec.lat, ec.lng, 100
FROM public.profiles p
LEFT JOIN (
  SELECT venue_name,
         (array_agg(latitude  ORDER BY date DESC))[1] AS lat,
         (array_agg(longitude ORDER BY date DESC))[1] AS lng
  FROM public.events WHERE latitude IS NOT NULL GROUP BY venue_name
) ec ON ec.venue_name = p.venue_name
WHERE p.account_type = 'club_venue' AND p.venue_name IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- 2) from events (any venue_name not yet present)
INSERT INTO public.venues (name, type, neighborhood, emoji, hue, latitude, longitude, sort)
SELECT e.venue_name,
       COALESCE(max(e.venue_type), 'club'),
       max(e.neighborhood),
       CASE COALESCE(max(e.venue_type),'club') WHEN 'splav' THEN '🚢' WHEN 'bar' THEN '🍸' WHEN 'gallery' THEN '🖼️' WHEN 'cafe' THEN '☕' ELSE '🎵' END,
       (abs(hashtext(e.venue_name)) % 360),
       (array_agg(e.latitude  ORDER BY e.date DESC))[1],
       (array_agg(e.longitude ORDER BY e.date DESC))[1],
       100
FROM public.events e
WHERE e.venue_name IS NOT NULL
GROUP BY e.venue_name
ON CONFLICT (name) DO NOTHING;

-- 3) fill missing coords on existing venues from events
UPDATE public.venues v
SET latitude = ec.lat, longitude = ec.lng
FROM (
  SELECT venue_name,
         (array_agg(latitude  ORDER BY date DESC))[1] AS lat,
         (array_agg(longitude ORDER BY date DESC))[1] AS lng
  FROM public.events WHERE latitude IS NOT NULL GROUP BY venue_name
) ec
WHERE v.name = ec.venue_name AND (v.latitude IS NULL OR v.longitude IS NULL);
