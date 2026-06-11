-- Full Quests system: custom/crew quests, rewards store, daily streak, sponsored quests.

-- ============================================================
-- 0. Spendable XP balance (separate from lifetime profiles.xp used for level + leaderboard)
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS spendable_xp INTEGER NOT NULL DEFAULT 0;
UPDATE public.profiles SET spendable_xp = GREATEST(COALESCE(xp, 0), spendable_xp);

-- ============================================================
-- 1. Custom (user-created) quests + crew members
-- ============================================================
CREATE TABLE IF NOT EXISTS public.custom_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  icon TEXT DEFAULT '🎯',
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'walk',         -- walk / match / custom
  target_count INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  timeframe TEXT NOT NULL DEFAULT 'week',     -- today / week / month
  deadline DATE,
  is_crew BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',      -- active / completed / expired
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custom_quests_creator ON public.custom_quests(creator_id);
ALTER TABLE public.custom_quests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.custom_quest_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.custom_quests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'joined',      -- invited / joined / declined
  progress INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quest_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cqm_quest ON public.custom_quest_members(quest_id);
CREATE INDEX IF NOT EXISTS idx_cqm_user ON public.custom_quest_members(user_id);
ALTER TABLE public.custom_quest_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own or member custom quests" ON public.custom_quests FOR SELECT
  USING (creator_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.custom_quest_members m WHERE m.quest_id = custom_quests.id AND m.user_id = auth.uid()
  ));
CREATE POLICY "create own custom quests" ON public.custom_quests FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "update own custom quests" ON public.custom_quests FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "view quest members" ON public.custom_quest_members FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.custom_quests q WHERE q.id = quest_id AND q.creator_id = auth.uid()
  ));
CREATE POLICY "insert quest members" ON public.custom_quest_members FOR INSERT
  WITH CHECK (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.custom_quests q WHERE q.id = quest_id AND q.creator_id = auth.uid()
  ));
CREATE POLICY "update own membership" ON public.custom_quest_members FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- 2. Rewards store
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  icon TEXT DEFAULT '🎁',
  title TEXT NOT NULL,
  sub TEXT,
  cost_xp INTEGER NOT NULL,
  tag TEXT,
  stock_label TEXT DEFAULT 'In stock',
  hue INTEGER NOT NULL DEFAULT 280,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads rewards" ON public.rewards FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  cost_xp INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'redeemed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON public.reward_redemptions(user_id);
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own redemptions" ON public.reward_redemptions FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- 3. Daily streak
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id UUID PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_claim_date DATE
);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own streak" ON public.user_streaks FOR SELECT USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.streak_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  claim_date DATE NOT NULL,
  xp INTEGER NOT NULL,
  UNIQUE (user_id, claim_date)
);
ALTER TABLE public.streak_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own streak claims" ON public.streak_claims FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- 4. Sponsored quests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sponsored_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  venue_name TEXT,
  logo TEXT DEFAULT '⭐',
  hue INTEGER NOT NULL DEFAULT 280,
  title TEXT NOT NULL,
  description TEXT,
  reward_label TEXT,
  target_count INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  spots_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.sponsored_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads sponsored" ON public.sponsored_quests FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.sponsored_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sponsored_quest_id UUID NOT NULL REFERENCES public.sponsored_quests(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sponsored_quest_id)
);
ALTER TABLE public.sponsored_quest_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own sponsored progress" ON public.sponsored_quest_progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "insert own sponsored progress" ON public.sponsored_quest_progress FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own sponsored progress" ON public.sponsored_quest_progress FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- 5. RPCs
-- ============================================================

-- Create a custom quest; creator auto-joins as a member.
CREATE OR REPLACE FUNCTION public.create_custom_quest(
  p_icon TEXT, p_title TEXT, p_description TEXT, p_kind TEXT,
  p_target INTEGER, p_xp INTEGER, p_timeframe TEXT, p_is_crew BOOLEAN
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_deadline DATE;
  v_id UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_deadline := CASE p_timeframe
    WHEN 'today' THEN current_date
    WHEN 'month' THEN current_date + 30
    ELSE current_date + 7 END;

  INSERT INTO public.custom_quests (creator_id, icon, title, description, kind, target_count, xp_reward, timeframe, deadline, is_crew)
  VALUES (v_user, COALESCE(p_icon,'🎯'), p_title, p_description, COALESCE(p_kind,'walk'),
          GREATEST(p_target,1), GREATEST(p_xp,0), COALESCE(p_timeframe,'week'), v_deadline, COALESCE(p_is_crew,false))
  RETURNING id INTO v_id;

  INSERT INTO public.custom_quest_members (quest_id, user_id, status)
  VALUES (v_id, v_user, 'joined');

  RETURN json_build_object('id', v_id, 'deadline', v_deadline);
END;
$$;

-- Claim today's streak: awards XP (lifetime + spendable), advances streak.
CREATE OR REPLACE FUNCTION public.claim_daily_streak()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_today DATE := current_date;
  v_last DATE;
  v_cur INTEGER;
  v_new INTEGER;
  v_xp INTEGER;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT last_claim_date, current_streak INTO v_last, v_cur
  FROM public.user_streaks WHERE user_id = v_user;

  IF v_last = v_today THEN
    RETURN json_build_object('already_claimed', true, 'current_streak', v_cur);
  END IF;

  v_new := CASE WHEN v_last = v_today - 1 THEN COALESCE(v_cur,0) + 1 ELSE 1 END;
  -- base 25 XP, +75 bonus every 7th day
  v_xp := 25 + CASE WHEN v_new % 7 = 0 THEN 75 ELSE 0 END;

  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_claim_date)
  VALUES (v_user, v_new, v_new, v_today)
  ON CONFLICT (user_id) DO UPDATE
    SET current_streak = v_new,
        longest_streak = GREATEST(public.user_streaks.longest_streak, v_new),
        last_claim_date = v_today;

  INSERT INTO public.streak_claims (user_id, claim_date, xp) VALUES (v_user, v_today, v_xp);

  -- award XP (lifetime + spendable); xp_transactions insert keeps leaderboard in sync
  INSERT INTO public.xp_transactions (user_id, amount, reason) VALUES (v_user, v_xp, 'Daily streak');
  UPDATE public.profiles SET xp = COALESCE(xp,0) + v_xp, spendable_xp = COALESCE(spendable_xp,0) + v_xp
  WHERE user_id = v_user;

  RETURN json_build_object('current_streak', v_new, 'xp', v_xp, 'claimed', true);
END;
$$;

-- Redeem a reward: deducts spendable_xp only (lifetime XP / leaderboard untouched).
CREATE OR REPLACE FUNCTION public.redeem_reward(p_reward_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_cost INTEGER;
  v_locked BOOLEAN;
  v_active BOOLEAN;
  v_balance INTEGER;
  v_title TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT cost_xp, is_locked, is_active, title INTO v_cost, v_locked, v_active, v_title
  FROM public.rewards WHERE id = p_reward_id;
  IF v_cost IS NULL THEN RAISE EXCEPTION 'Reward not found'; END IF;
  IF v_locked OR NOT v_active THEN RAISE EXCEPTION 'Reward unavailable'; END IF;

  SELECT COALESCE(spendable_xp,0) INTO v_balance FROM public.profiles WHERE user_id = v_user;
  IF v_balance < v_cost THEN RAISE EXCEPTION 'Not enough XP'; END IF;

  UPDATE public.profiles SET spendable_xp = spendable_xp - v_cost WHERE user_id = v_user;
  INSERT INTO public.reward_redemptions (user_id, reward_id, cost_xp) VALUES (v_user, p_reward_id, v_cost);

  RETURN json_build_object('redeemed', true, 'balance', v_balance - v_cost, 'title', v_title);
END;
$$;

-- Accept a sponsored quest (idempotent).
CREATE OR REPLACE FUNCTION public.accept_sponsored_quest(p_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.sponsored_quest_progress (user_id, sponsored_quest_id)
  VALUES (v_user, p_id)
  ON CONFLICT (user_id, sponsored_quest_id) DO NOTHING;
  RETURN json_build_object('accepted', true);
END;
$$;

-- ============================================================
-- 6. Seeds
-- ============================================================
INSERT INTO public.rewards (code, icon, title, sub, cost_xp, tag, stock_label, hue, is_locked, sort) VALUES
  ('free_drink',  '🍹', 'Free welcome drink',    'At any partner venue',         800,  'Popular',    'In stock', 354, false, 1),
  ('skip_line',   '🚪', 'Skip-the-line pass',     'One club entry, no queue',     1200, NULL,         'In stock', 282, false, 2),
  ('peeks_3',     '👁', '3 free venue peeks',     'Unlock "who''s here" ×3',      500,  'Best value', 'In stock', 200, false, 3),
  ('ticket_50',   '🎟', '50% off event ticket',   'Selected events this week',    1500, NULL,         '4 left',   38,  false, 4),
  ('plus_week',   '💎', 'AfterBefore+ · 1 week',  'Unlimited peeks + priority',   3000, NULL,         'In stock', 308, false, 5),
  ('bottle_20',   '🥂', 'Bottle service −20%',    'Karmakoma & Para Klub',        5000, 'Premium',    'VIP only', 160, true,  6)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.sponsored_quests (code, venue_name, logo, hue, title, description, reward_label, target_count, xp_reward, spots_label, sort) VALUES
  ('drugstore_50',  'Drugstore',  '🎵', 282, 'First 50 at the door', 'Check in before 00:30 tonight',   'Free welcome shot', 1, 120, '50 spots · 31 left', 1),
  ('kafeterija_reg','Kafeterija', '☕', 38,  'Morning regular',      'Check in 3 mornings this week',   '1 free V60 coffee', 3, 90,  'Unlimited',          2),
  ('para_crew',     'Para Klub',  '🎵', 200, 'Bring the crew',       'Arrive with 3+ matched friends',  'Skip-the-line × 4', 4, 250, 'Weekend only',       3)
ON CONFLICT (code) DO NOTHING;
