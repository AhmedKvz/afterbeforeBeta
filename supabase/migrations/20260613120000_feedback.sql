-- Beta feedback capture
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  message TEXT NOT NULL,
  rating INTEGER,
  context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone submits feedback" ON public.feedback FOR INSERT WITH CHECK (true);
