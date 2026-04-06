
-- Add event_type, is_secret, and related columns to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'regular';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_secret BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS secret_location_reveal_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS requires_verified_profile BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_guests INTEGER;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS access_price_rsd INTEGER DEFAULT 0;

-- Add verification columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_followers INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE;

-- Create secret_party_invites table
CREATE TABLE IF NOT EXISTS public.secret_party_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active',
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.secret_party_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invites" ON public.secret_party_invites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Event hosts can view invites" ON public.secret_party_invites FOR SELECT USING (event_id IN (SELECT id FROM public.events WHERE host_id = auth.uid()));
CREATE POLICY "Event hosts can insert invites" ON public.secret_party_invites FOR INSERT WITH CHECK (event_id IN (SELECT id FROM public.events WHERE host_id = auth.uid()));
CREATE POLICY "Event hosts can update invites" ON public.secret_party_invites FOR UPDATE USING (event_id IN (SELECT id FROM public.events WHERE host_id = auth.uid()));
CREATE POLICY "Event hosts can delete invites" ON public.secret_party_invites FOR DELETE USING (event_id IN (SELECT id FROM public.events WHERE host_id = auth.uid()));

-- Create secret_party_requests table
CREATE TABLE IF NOT EXISTS public.secret_party_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  request_message TEXT,
  payment_amount_rsd INTEGER DEFAULT 0,
  paid_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.secret_party_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON public.secret_party_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create requests" ON public.secret_party_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Event hosts can view requests" ON public.secret_party_requests FOR SELECT USING (event_id IN (SELECT id FROM public.events WHERE host_id = auth.uid()));
CREATE POLICY "Event hosts can update requests" ON public.secret_party_requests FOR UPDATE USING (event_id IN (SELECT id FROM public.events WHERE host_id = auth.uid()));

-- Create instagram_connections table
CREATE TABLE IF NOT EXISTS public.instagram_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  instagram_handle TEXT NOT NULL,
  instagram_id TEXT,
  access_token TEXT,
  followers_count INTEGER,
  profile_picture_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  token_expires_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.instagram_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connection" ON public.instagram_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own connection" ON public.instagram_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own connection" ON public.instagram_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own connection" ON public.instagram_connections FOR DELETE USING (auth.uid() = user_id);

-- Generate invite code function
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := 'AB-';
  i INTEGER;
BEGIN
  FOR i IN 1..4 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  code := code || '-';
  FOR i IN 1..4 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Approve secret party request function
CREATE OR REPLACE FUNCTION public.approve_secret_party_request(request_id UUID)
RETURNS JSON AS $$
DECLARE
  req RECORD;
  new_code TEXT;
  invite_record RECORD;
BEGIN
  SELECT * INTO req FROM public.secret_party_requests WHERE id = request_id;
  IF req IS NULL THEN
    RETURN json_build_object('error', 'Request not found');
  END IF;
  
  UPDATE public.secret_party_requests 
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = NOW()
  WHERE id = request_id;
  
  LOOP
    new_code := public.generate_invite_code();
    BEGIN
      INSERT INTO public.secret_party_invites (event_id, user_id, invite_code, expires_at)
      VALUES (req.event_id, req.user_id, new_code, 
              (SELECT date + start_time::interval + interval '2 hours' FROM public.events WHERE id = req.event_id))
      RETURNING * INTO invite_record;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true, 
    'invite_code', new_code,
    'user_id', req.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
