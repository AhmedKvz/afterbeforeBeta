-- Create app_role enum if not exists
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  age INTEGER,
  city TEXT,
  avatar_url TEXT,
  bio TEXT,
  music_preferences TEXT[],
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  events_attended INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  venue_name TEXT,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  image_url TEXT,
  music_genres TEXT[],
  capacity INTEGER,
  price DECIMAL(10, 2),
  host_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event check-ins
CREATE TABLE IF NOT EXISTS public.event_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  UNIQUE(event_id, user_id)
);

-- Event wishlists
CREATE TABLE IF NOT EXISTS public.event_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS on base tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_wishlists ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Events policies
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- Event checkins policies
DROP POLICY IF EXISTS "Users can view all checkins" ON public.event_checkins;
CREATE POLICY "Users can view all checkins"
  ON public.event_checkins FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can check in themselves" ON public.event_checkins;
CREATE POLICY "Users can check in themselves"
  ON public.event_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Event wishlists policies
DROP POLICY IF EXISTS "Users can view own wishlists" ON public.event_wishlists;
CREATE POLICY "Users can view own wishlists"
  ON public.event_wishlists FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to own wishlist" ON public.event_wishlists;
CREATE POLICY "Users can add to own wishlist"
  ON public.event_wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from own wishlist" ON public.event_wishlists;
CREATE POLICY "Users can remove from own wishlist"
  ON public.event_wishlists FOR DELETE
  USING (auth.uid() = user_id);

-- Insert some sample events
INSERT INTO public.events (title, description, date, start_time, venue_name, address, latitude, longitude, image_url, music_genres, capacity, price) VALUES
('Warehouse Rave', 'Underground techno session with intense basslines. Warehouse vibes, 3AM energy.', CURRENT_DATE + INTERVAL '1 day', '23:00', 'Warehouse Belgrade', 'Savska 25, Belgrade', 44.8125, 20.4612, 'https://images.unsplash.com/photo-1571266028243-d220e7a25e74?w=800', ARRAY['Techno', 'Hard Techno'], 200, 15.00),
('Deep House Sunday', 'Smooth deep house grooves for a perfect Sunday evening. Rooftop vibes.', CURRENT_DATE + INTERVAL '3 days', '18:00', 'Rooftop Club', 'Knez Mihailova 12, Belgrade', 44.8176, 20.4569, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800', ARRAY['Deep House', 'House'], 150, 10.00),
('20 Events Anniversary', 'Celebrating 20 years of electronic music. Special guests from Berlin.', CURRENT_DATE + INTERVAL '7 days', '22:00', '20 Events Club', 'Bulevar Despota Stefana 5, Belgrade', 44.8200, 20.4700, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800', ARRAY['Techno', 'Minimal'], 500, 25.00),
('Indie Night', 'Alternative rock and indie vibes. Live bands and DJs.', CURRENT_DATE + INTERVAL '2 days', '21:00', 'Drugstore', 'Bulevar vojvode Bojovica 2, Belgrade', 44.8050, 20.4550, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800', ARRAY['Indie', 'Rock', 'Alternative'], 300, 8.00),
('Hip Hop Nights', 'Best hip hop and R&B. Local and international DJs.', CURRENT_DATE + INTERVAL '5 days', '23:00', 'Klub 94', 'Makedonska 22, Belgrade', 44.8130, 20.4680, 'https://images.unsplash.com/photo-1571266028243-3c8a8e6c4b9e?w=800', ARRAY['Hip Hop', 'R&B'], 250, 12.00),
('Trance Nation', 'Epic trance journey with top international DJs. Lasers and massive sound.', CURRENT_DATE + INTERVAL '10 days', '22:00', 'Arena Belgrade', 'Bulevar Arsenija Carnojevica 58, Belgrade', 44.8156, 20.4234, 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800', ARRAY['Trance', 'Progressive'], 1000, 30.00)
ON CONFLICT DO NOTHING;