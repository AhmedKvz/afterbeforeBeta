-- Party diary: per-event mementos with visibility (public / close_friends / private) + close-friends allow-list

CREATE TABLE IF NOT EXISTS public.close_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,      -- owner of the list
  friend_id UUID NOT NULL,    -- the close friend
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id)
);
ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage own close friends" ON public.close_friends FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- a friend may see that they're on someone's list (needed to resolve visibility client-side if ever)
CREATE POLICY "see lists i'm on" ON public.close_friends FOR SELECT USING (auth.uid() = friend_id);

CREATE TABLE IF NOT EXISTS public.mementos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  note TEXT,
  media_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',  -- public | close_friends | private
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_mementos_user ON public.mementos(user_id, created_at DESC);
ALTER TABLE public.mementos ENABLE ROW LEVEL SECURITY;

-- owner: full control
CREATE POLICY "manage own mementos" ON public.mementos FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- others: public always; close_friends only if viewer is on the owner's list
CREATE POLICY "view permitted mementos" ON public.mementos FOR SELECT USING (
  visibility = 'public'
  OR (visibility = 'close_friends' AND EXISTS (
    SELECT 1 FROM public.close_friends cf WHERE cf.user_id = mementos.user_id AND cf.friend_id = auth.uid()
  ))
);

DROP TRIGGER IF EXISTS trg_mementos_updated ON public.mementos;
CREATE TRIGGER trg_mementos_updated BEFORE UPDATE ON public.mementos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
