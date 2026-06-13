-- Marketing waitlist (landing page lead capture).
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  platform TEXT,                 -- ios / android / either
  source TEXT DEFAULT 'landing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email)
);
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- anyone may join; nobody can read it publicly (privacy)
CREATE POLICY "anyone can join waitlist" ON public.waitlist FOR INSERT WITH CHECK (true);
