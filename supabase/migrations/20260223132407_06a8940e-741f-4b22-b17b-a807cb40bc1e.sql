
-- =============================================
-- FEATURE 1: Location Presence for always-on swipe
-- =============================================
CREATE TABLE IF NOT EXISTS public.location_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  location_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.location_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see visible nearby users"
  ON public.location_presence FOR SELECT USING (is_visible = true);

CREATE POLICY "Users can insert own presence"
  ON public.location_presence FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presence"
  ON public.location_presence FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presence"
  ON public.location_presence FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_location_presence_last_seen ON public.location_presence(last_seen);
CREATE INDEX idx_location_presence_user ON public.location_presence(user_id);

-- Allow event_id to be nullable on active_users for location-based swipe
ALTER TABLE public.active_users ALTER COLUMN event_id DROP NOT NULL;

-- Allow event_id to be nullable on swipes for location-based swipe
ALTER TABLE public.swipes ALTER COLUMN event_id DROP NOT NULL;

-- Allow event_id to be nullable on matches for location-based matches
ALTER TABLE public.matches ALTER COLUMN event_id DROP NOT NULL;

-- =============================================
-- FEATURE 2: Notifications
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications"
  ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =============================================
-- FEATURE 3: Vibe Signals for Scene Panel
-- =============================================
CREATE TABLE IF NOT EXISTS public.vibe_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID REFERENCES public.events(id),
  venue_name TEXT,
  signal_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.vibe_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read vibe signals"
  ON public.vibe_signals FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create signals"
  ON public.vibe_signals FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FEATURE 4: Quest System
-- =============================================
CREATE TABLE IF NOT EXISTS public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  quest_type TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  icon TEXT DEFAULT '🎯',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quests" ON public.quests FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.user_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  quest_id UUID REFERENCES public.quests(id) NOT NULL,
  week_start DATE NOT NULL,
  progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  xp_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, quest_id, week_start)
);

ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own progress" ON public.user_quests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.user_quests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.user_quests FOR UPDATE USING (auth.uid() = user_id);

-- Seed quests
INSERT INTO public.quests (title, description, quest_type, target_count, xp_reward, icon) VALUES
  ('Weekend Warrior', 'Check in at 2 events this week', 'check_in', 2, 200, '📍'),
  ('Social Spark', 'Get 3 matches this week', 'match', 3, 300, '💜'),
  ('Scene Reporter', 'Write 2 event reviews', 'review', 2, 250, '✍️'),
  ('Vibe Check', 'Submit 3 vibe signals at different events', 'vibe', 3, 150, '🔥'),
  ('Explorer', 'Visit 2 different venues', 'explore', 2, 200, '🗺️'),
  ('Hype Builder', 'Signal "I''m Going" to 3 events', 'signal', 3, 150, '🚀'),
  ('Connector', 'Wave at 2 matches', 'social', 2, 100, '👋');
