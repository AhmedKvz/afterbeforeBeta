-- DJ lineup per event (array of artist names). Venues populate it; UI shows it when present.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS lineup TEXT[] DEFAULT '{}';

-- demo backfill for seeded club events so the Lineup section is visible
UPDATE public.events
SET lineup = ARRAY['MAGLA','BLR','Filip Xavi','RDS','Untold']
WHERE venue_type = 'club' AND (lineup IS NULL OR lineup = '{}');
