-- Add venue_type and neighborhood to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS venue_type TEXT DEFAULT 'club';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- Add venue_type and neighborhood to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS venue_type TEXT DEFAULT 'club';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- Update existing events with venue_type
UPDATE public.events SET venue_type = 'club' WHERE venue_name IN ('Drugstore', 'Karmakoma', 'Para', 'Kult', 'Telma', 'KPTM', '20/44', 'Gadost', 'Mint Club');
UPDATE public.events SET venue_type = 'cafe_bar' WHERE venue_name IN ('Zaokret', 'Dvorištance', 'Supermarket');
UPDATE public.events SET venue_type = 'gallery' WHERE venue_name = 'Galerija DOTS';

-- Update existing events with neighborhood
UPDATE public.events SET neighborhood = 'Savamala' WHERE venue_name IN ('Drugstore', 'KPTM', '20/44', 'Mint Club', 'Zaokret');
UPDATE public.events SET neighborhood = 'Vracar' WHERE venue_name IN ('Karmakoma', 'Telma');
UPDATE public.events SET neighborhood = 'Dorcol' WHERE venue_name IN ('Para', 'Gadost', 'Dvorištance', 'Supermarket', 'Galerija DOTS');
UPDATE public.events SET neighborhood = 'Savski Venac' WHERE venue_name = 'Kult';

-- Update existing profiles with venue_type and neighborhood
UPDATE public.profiles SET venue_type = 'club', neighborhood = 'Savamala' WHERE venue_name = 'Drugstore';
UPDATE public.profiles SET venue_type = 'club', neighborhood = 'Vracar' WHERE venue_name = 'Karmakoma';
UPDATE public.profiles SET venue_type = 'club', neighborhood = 'Dorcol' WHERE venue_name = 'Para';
UPDATE public.profiles SET venue_type = 'club', neighborhood = 'Savski Venac' WHERE venue_name = 'Kult';
UPDATE public.profiles SET venue_type = 'club', neighborhood = 'Vracar' WHERE venue_name = 'Telma';
UPDATE public.profiles SET venue_type = 'club', neighborhood = 'Savamala' WHERE venue_name = 'KPTM';
UPDATE public.profiles SET venue_type = 'club', neighborhood = 'Savamala' WHERE venue_name = '20/44';
UPDATE public.profiles SET venue_type = 'club', neighborhood = 'Dorcol' WHERE venue_name = 'Gadost';
UPDATE public.profiles SET venue_type = 'club', neighborhood = 'Savamala' WHERE venue_name = 'Mint Club';
UPDATE public.profiles SET venue_type = 'cafe_bar', neighborhood = 'Savamala' WHERE venue_name = 'Zaokret';
UPDATE public.profiles SET venue_type = 'cafe_bar', neighborhood = 'Dorcol' WHERE venue_name = 'Dvorištance';
UPDATE public.profiles SET venue_type = 'cafe_bar', neighborhood = 'Dorcol' WHERE venue_name = 'Supermarket';
UPDATE public.profiles SET venue_type = 'gallery', neighborhood = 'Dorcol' WHERE venue_name = 'Galerija DOTS';