
-- Add venue columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'party_goer';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_type_check CHECK (account_type IN ('party_goer', 'club_venue'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS venue_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS venue_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS venue_description TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS venue_logo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS venue_capacity INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS venue_music_genres TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS venue_instagram TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS venue_contact_phone TEXT;

-- Update handle_new_user trigger to read account_type from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'party_goer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
