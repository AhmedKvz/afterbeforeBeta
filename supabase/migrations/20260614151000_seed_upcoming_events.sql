-- Seed upcoming events across the venue directory so Home / Heat / Discovery feel alive.
-- Pulls coords/type/neighborhood from venues. Idempotent-ish (skips if title+date+venue exists).

INSERT INTO public.events (title, description, date, start_time, end_time, venue_name, venue_type, neighborhood, latitude, longitude, music_genres, event_type, capacity, price)
SELECT s.title, s.descr, current_date + s.dd, s.st::time, s.et::time, s.venue, v.type, v.neighborhood, v.latitude, v.longitude, s.genres, 'public', s.cap, s.price
FROM (VALUES
  ('Techno Sunrise',        'All-night techno with resident DJs.',        'Drugstore',     1, '23:30','06:00', ARRAY['techno','industrial'], 600, 1200),
  ('Kult Underground',      'Alternative & techno, intimate floor.',      'Kult',          2, '23:00','05:00', ARRAY['techno','alternative'], 250, 800),
  ('Para Late',             'House to techno, deep into the night.',      'Para Klub',     2, '00:00','06:00', ARRAY['house','techno'], 400, 900),
  ('25 Sessions',           'Cocktails & vinyl DJ set.',                  '25 Bar',        1, '21:00','02:00', ARRAY['disco','funk'], 120, 0),
  ('Karma Nights',          'Eclectic dance, no genre rules.',           'Karmakoma',     3, '22:30','04:00', ARRAY['eclectic','disco'], 180, 500),
  ('River Opening',         'Splav season opener on the water.',          '20/44',         4, '22:00','05:00', ARRAY['house','melodic'], 500, 700),
  ('Freestyler Saturday',   'The classic river party.',                  'Freestyler',    5, '23:00','06:00', ARRAY['commercial','house'], 800, 600),
  ('Hangar Bass',           'Bass, DnB & garage night.',                 'Hangar',        5, '23:30','05:30', ARRAY['dnb','garage'], 700, 800),
  ('Dvorištance Summer',    'Courtyard sunset to night.',                'Dvorištance',   1, '19:00','01:00', ARRAY['indie','disco'], 150, 0),
  ('Gadost Raw',            'Raw alternative electronic.',               'Gadost',        3, '23:00','05:00', ARRAY['techno','ebm'], 200, 600),
  ('Mint Mainfloor',        'House & mainstream electronic.',            'Mint Club',     4, '23:30','05:00', ARRAY['house','commercial'], 400, 900),
  ('Supermarket Concept',   'Concept night with live visuals.',          'Supermarket',   5, '23:00','05:00', ARRAY['melodic','progressive'], 350, 800),
  ('Telma Alt',             'Alt electronic & experimental.',            'Telma',         6, '23:00','04:00', ARRAY['experimental','techno'], 220, 500),
  ('DOTS Opening',          'Gallery opening + DJ afterparty.',          'Galerija DOTS', 2, '20:00','01:00', ARRAY['ambient','downtempo'], 120, 0),
  ('Tube Bunker',           'Deep underground techno.',                  'Tube',          6, '23:30','06:00', ARRAY['techno','minimal'], 300, 700),
  ('Brankow Bridge',        'Riverside house party.',                    'Brankow',       7, '23:00','05:00', ARRAY['house','afro'], 450, 800),
  ('Zaokret Live',          'Live band + DJ after.',                     'Zaokret',       3, '21:00','02:00', ARRAY['rock','indie'], 160, 400),
  ('KPTM Big Room',         'Big-room electronic night.',                'KPTM',          5, '23:30','05:00', ARRAY['edm','house'], 600, 1000),
  ('Half Floating',         'Floating dancefloor on the Sava.',          'Half',          6, '23:00','05:00', ARRAY['house','disco'], 500, 700),
  ('Berlin Bar',            'Small floor, big energy.',                  'Berlin',        2, '22:00','03:00', ARRAY['techno','electro'], 140, 300),
  ('Kvaka DIY',             'DIY culture & alt club night.',             'Kvaka 22',      4, '22:00','04:00', ARRAY['punk','alternative'], 200, 400),
  ('Apartman Lounge',       'Lounge & deep house.',                      'Apartman',      1, '21:00','03:00', ARRAY['deep-house','lounge'], 150, 200)
) AS s(title, descr, venue, dd, st, et, genres, cap, price)
JOIN public.venues v ON v.name = s.venue
WHERE NOT EXISTS (
  SELECT 1 FROM public.events e WHERE e.title = s.title AND e.venue_name = s.venue AND e.date = current_date + s.dd
);
