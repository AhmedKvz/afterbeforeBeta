-- ============================================================
-- Full-scene venue seed — kompletiranje beogradskog imenika našeg realma:
-- svirke → jazz → clubbing (founder zahtev 2026-07-12). Samo AKTIVNA mesta
-- potvrđena pretragom/poznata institucija scene; nesigurna (Dim, Depo Magacin,
-- Jazz Bašta...) namerno IZOSTAVLJENA — bolji rupa u imeniku nego mrtvo mesto.
-- Koordinate približne unutar bloka (geofence OFF u beti; proveriti pre
-- produkcijskog geofence-a). Idempotentno po imenu.
-- Kvartovi = ključevi HOOD_COORDS mape (Stari grad / Savamala / Dorćol /
-- Vračar / Savski venac) da pinovi legnu na pravi deo City-Pulse mape.
-- ============================================================

INSERT INTO public.venues (name, slug, type, neighborhood, emoji, latitude, longitude)
SELECT v.name, v.slug, v.type, v.neighborhood, v.emoji, v.lat, v.lng
FROM (VALUES
  -- Cetinjska 15 čvorište (alternativna scena)
  ('Elektropionir', 'elektropionir', 'club', 'Stari grad',  '🎤', 44.8165, 20.4645),  -- koncertni klub, ex Gun Club
  ('Kenozoik',      'kenozoik',      'bar',  'Stari grad',  '🎸', 44.8164, 20.4643),  -- R&R bar, Cetinjska

  -- Klubing stubovi koji su falili
  ('Barutana',      'barutana',      'club', 'Stari grad',  '🏰', 44.8258, 20.4492),  -- Kalemegdan open-air
  ('Mladost',       'mladost',       'club', 'Savamala',    '🎧', 44.8135, 20.4515),  -- Karađorđeva 44
  ('Ludost',        'ludost',        'club', 'Savamala',    '🎧', 44.8136, 20.4517),  -- uz Mladost
  ('Lasta',         'lasta',         'club', 'Savamala',    '🎧', 44.8168, 20.4505),  -- Karađorđeva, uz Savu

  -- Svirke · jazz · koncerti
  ('Bitefartcafe',  'bitefartcafe',  'bar',  'Stari grad',  '🎷', 44.8180, 20.4650),  -- Skadarlija, jazz/funk svirke
  ('Dom Omladine',  'dom-omladine',  'club', 'Stari grad',  '🎤', 44.8155, 20.4620),  -- Makedonska, koncerti
  ('KST',           'kst',           'club', 'Vračar',      '🎸', 44.8055, 20.4780),  -- studentske svirke, institucija
  ('Dorćol Platz',  'dorcol-platz',  'club', 'Dorćol',      '🎨', 44.8225, 20.4670),  -- kulturni centar + žurke

  -- Kafe-bar / kafići realm (pre-party + dnevni mod mape)
  ('Blaznavac',     'blaznavac',     'bar',  'Stari grad',  '🎨', 44.8175, 20.4655),  -- Skadarlija art kafe-bar
  ('Samo Pivo',     'samo-pivo',     'bar',  'Savski venac','🍺', 44.8115, 20.4570),  -- Balkanska, craft
  ('Koffein',       'koffein',       'cafe', 'Stari grad',  '☕', 44.8165, 20.4575),  -- specialty kafa
  ('Pržionica D59B','przionica-d59b','cafe', 'Dorćol',      '☕', 44.8228, 20.4668)   -- specialty kafa, Dobračina
) AS v(name, slug, type, neighborhood, emoji, lat, lng)
WHERE NOT EXISTS (
  SELECT 1 FROM public.venues e WHERE lower(e.name) = lower(v.name)
);
