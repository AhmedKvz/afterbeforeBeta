-- Launch refresh: populate the next 2 weeks of upcoming events (Thu/Fri/Sat),
-- so Home/Heat/Discovery stay alive through the launch window.
-- Partners get every weekend night; non-partners rotate (deterministic). Idempotent per (venue,date).
-- NOTE: placeholder events — replace with REAL partner-club events as they come in.

INSERT INTO public.events
  (title, description, date, start_time, end_time, venue_name, venue_type, neighborhood, latitude, longitude, music_genres, event_type, capacity, price)
SELECT
  v.name || CASE extract(dow FROM d)::int WHEN 4 THEN ' · Thursday' WHEN 5 THEN ' · Friday' ELSE ' · Saturday' END,
  'Live DJs at ' || v.name || '.',
  d::date,
  (CASE WHEN v.type = 'bar' THEN '21:00' WHEN v.type = 'cafe' THEN '19:00' ELSE '23:00' END)::time,
  '05:00'::time,
  v.name, v.type, v.neighborhood, v.latitude, v.longitude,
  (CASE WHEN v.type = 'splav' THEN ARRAY['house','melodic']
        WHEN v.type = 'bar'   THEN ARRAY['disco','funk']
        ELSE ARRAY['techno','house'] END),
  'public', 300, 600
FROM public.venues v
CROSS JOIN generate_series(current_date::timestamp, (current_date + 13)::timestamp, '1 day'::interval) AS d
WHERE extract(dow FROM d)::int IN (4, 5, 6)                              -- Thu / Fri / Sat
  AND (v.is_partner OR (v.sort + extract(doy FROM d)::int) % 3 = 0)      -- partners always + ~1/3 rotation
  AND NOT EXISTS (
    SELECT 1 FROM public.events e WHERE e.venue_name = v.name AND e.date = d::date
  );
