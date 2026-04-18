
-- ============================================
-- SCENE CREDITS ACCOUNTS
-- ============================================
CREATE TABLE public.scene_credits_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_cents integer NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  lifetime_loaded_cents integer NOT NULL DEFAULT 0 CHECK (lifetime_loaded_cents >= 0),
  lifetime_spent_cents integer NOT NULL DEFAULT 0 CHECK (lifetime_spent_cents >= 0),
  kyc_tier text NOT NULL DEFAULT 'none' CHECK (kyc_tier IN ('none', 'verified')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scene_credits_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own SC account"
  ON public.scene_credits_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER update_sc_accounts_updated_at
  BEFORE UPDATE ON public.scene_credits_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SCENE CREDITS TRANSACTIONS
-- ============================================
CREATE TABLE public.scene_credits_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('topup', 'spend', 'gift_sent', 'gift_received', 'refund')),
  amount_cents integer NOT NULL,
  related_user_id uuid REFERENCES auth.users(id),
  venue_id uuid,
  event_id uuid REFERENCES public.events(id),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sc_tx_user_created ON public.scene_credits_transactions(user_id, created_at DESC);

ALTER TABLE public.scene_credits_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own SC transactions"
  ON public.scene_credits_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- XP GIFTS
-- ============================================
CREATE TABLE public.xp_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  message text,
  claimed boolean NOT NULL DEFAULT false,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_gifts_recipient ON public.xp_gifts(recipient_id, claimed);
CREATE INDEX idx_xp_gifts_sender ON public.xp_gifts(sender_id, created_at DESC);

ALTER TABLE public.xp_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view gifts they sent or received"
  ON public.xp_gifts FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- ============================================
-- PARTNER VENUES (Scene Credits acceptors)
-- ============================================
CREATE TABLE public.partner_venues_sc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_name text NOT NULL UNIQUE,
  logo_url text,
  brand_color text DEFAULT '#7F77DD',
  active boolean NOT NULL DEFAULT true,
  platform_fee_bps integer NOT NULL DEFAULT 1200,
  monthly_redemption_cap_cents integer,
  last_settlement_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_venues_sc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active partner venues"
  ON public.partner_venues_sc FOR SELECT
  USING (active = true);

-- ============================================
-- AUTO-CREATE SC ACCOUNT ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.create_sc_account_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.scene_credits_accounts (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_sc_account_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_sc_account_for_new_user();

-- Backfill existing users
INSERT INTO public.scene_credits_accounts (user_id)
SELECT user_id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- RPC: gift_xp
-- ============================================
CREATE OR REPLACE FUNCTION public.gift_xp(
  p_recipient_id uuid,
  p_amount integer,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id uuid := auth.uid();
  v_sender_xp integer;
  v_daily_used integer;
  v_monthly_used integer;
  v_gift_id uuid;
BEGIN
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_sender_id = p_recipient_id THEN
    RAISE EXCEPTION 'Cannot gift XP to yourself';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT xp INTO v_sender_xp FROM public.profiles WHERE user_id = v_sender_id;
  IF v_sender_xp IS NULL OR v_sender_xp < p_amount THEN
    RAISE EXCEPTION 'Insufficient XP balance';
  END IF;

  -- Daily limit: 500 XP / 24h
  SELECT COALESCE(SUM(amount), 0) INTO v_daily_used
  FROM public.xp_gifts
  WHERE sender_id = v_sender_id AND created_at > now() - interval '24 hours';
  IF v_daily_used + p_amount > 500 THEN
    RAISE EXCEPTION 'Daily gift limit exceeded (500 XP / 24h)';
  END IF;

  -- Monthly limit: 2000 XP / 30 days
  SELECT COALESCE(SUM(amount), 0) INTO v_monthly_used
  FROM public.xp_gifts
  WHERE sender_id = v_sender_id AND created_at > now() - interval '30 days';
  IF v_monthly_used + p_amount > 2000 THEN
    RAISE EXCEPTION 'Monthly gift limit exceeded (2000 XP / 30d)';
  END IF;

  -- Deduct XP from sender
  UPDATE public.profiles SET xp = xp - p_amount WHERE user_id = v_sender_id;
  INSERT INTO public.xp_transactions (user_id, amount, reason)
  VALUES (v_sender_id, -p_amount, 'Gift to user');

  -- Create gift record
  INSERT INTO public.xp_gifts (sender_id, recipient_id, amount, message)
  VALUES (v_sender_id, p_recipient_id, p_amount, p_message)
  RETURNING id INTO v_gift_id;

  -- Notify recipient
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_recipient_id,
    'xp_gift',
    'Stigao ti je XP poklon',
    COALESCE(p_message, 'Neko ti je poslao ' || p_amount || ' XP'),
    jsonb_build_object('gift_id', v_gift_id, 'amount', p_amount, 'sender_id', v_sender_id)
  );

  RETURN v_gift_id;
END;
$$;

-- ============================================
-- RPC: claim_xp_gift
-- ============================================
CREATE OR REPLACE FUNCTION public.claim_xp_gift(p_gift_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_gift RECORD;
  v_new_balance integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_gift FROM public.xp_gifts WHERE id = p_gift_id FOR UPDATE;
  IF v_gift IS NULL THEN
    RAISE EXCEPTION 'Gift not found';
  END IF;
  IF v_gift.recipient_id != v_user_id THEN
    RAISE EXCEPTION 'Not your gift';
  END IF;
  IF v_gift.claimed THEN
    RAISE EXCEPTION 'Gift already claimed';
  END IF;

  UPDATE public.xp_gifts SET claimed = true, claimed_at = now() WHERE id = p_gift_id;
  UPDATE public.profiles SET xp = xp + v_gift.amount WHERE user_id = v_user_id
    RETURNING xp INTO v_new_balance;
  INSERT INTO public.xp_transactions (user_id, amount, reason)
  VALUES (v_user_id, v_gift.amount, 'Gift received');

  RETURN v_new_balance;
END;
$$;

-- ============================================
-- RPC: topup_scene_credits (mock for MVP)
-- ============================================
CREATE OR REPLACE FUNCTION public.topup_scene_credits(p_amount_cents integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_new_balance integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_amount_cents <= 0 OR p_amount_cents > 10000 THEN
    RAISE EXCEPTION 'Invalid topup amount (max €100)';
  END IF;

  -- Ensure account exists
  INSERT INTO public.scene_credits_accounts (user_id)
  VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.scene_credits_accounts
  SET balance_cents = balance_cents + p_amount_cents,
      lifetime_loaded_cents = lifetime_loaded_cents + p_amount_cents,
      updated_at = now()
  WHERE user_id = v_user_id
  RETURNING balance_cents INTO v_new_balance;

  INSERT INTO public.scene_credits_transactions (user_id, type, amount_cents, description)
  VALUES (v_user_id, 'topup', p_amount_cents, 'Mock topup');

  RETURN v_new_balance;
END;
$$;

-- ============================================
-- RPC: send_scene_credits
-- ============================================
CREATE OR REPLACE FUNCTION public.send_scene_credits(
  p_recipient_id uuid,
  p_amount_cents integer,
  p_venue_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id uuid := auth.uid();
  v_sender_balance integer;
  v_daily_sent integer;
  v_new_sender_balance integer;
BEGIN
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_sender_id = p_recipient_id THEN
    RAISE EXCEPTION 'Cannot send to yourself';
  END IF;
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  IF p_amount_cents > 2000 THEN
    RAISE EXCEPTION 'Max €20 per transaction (no KYC)';
  END IF;

  -- Daily limit €100
  SELECT COALESCE(SUM(ABS(amount_cents)), 0) INTO v_daily_sent
  FROM public.scene_credits_transactions
  WHERE user_id = v_sender_id
    AND type IN ('gift_sent', 'spend')
    AND created_at > now() - interval '24 hours';
  IF v_daily_sent + p_amount_cents > 10000 THEN
    RAISE EXCEPTION 'Daily limit exceeded (€100 / 24h)';
  END IF;

  SELECT balance_cents INTO v_sender_balance
  FROM public.scene_credits_accounts WHERE user_id = v_sender_id FOR UPDATE;
  IF v_sender_balance IS NULL OR v_sender_balance < p_amount_cents THEN
    RAISE EXCEPTION 'Insufficient Scene Credits';
  END IF;

  -- Ensure recipient account
  INSERT INTO public.scene_credits_accounts (user_id)
  VALUES (p_recipient_id) ON CONFLICT (user_id) DO NOTHING;

  -- Deduct sender
  UPDATE public.scene_credits_accounts
  SET balance_cents = balance_cents - p_amount_cents, updated_at = now()
  WHERE user_id = v_sender_id
  RETURNING balance_cents INTO v_new_sender_balance;

  -- Credit recipient
  UPDATE public.scene_credits_accounts
  SET balance_cents = balance_cents + p_amount_cents, updated_at = now()
  WHERE user_id = p_recipient_id;

  -- Log both sides
  INSERT INTO public.scene_credits_transactions (user_id, type, amount_cents, related_user_id, venue_id, description)
  VALUES (v_sender_id, 'gift_sent', -p_amount_cents, p_recipient_id, p_venue_id, p_description);

  INSERT INTO public.scene_credits_transactions (user_id, type, amount_cents, related_user_id, venue_id, description)
  VALUES (p_recipient_id, 'gift_received', p_amount_cents, v_sender_id, p_venue_id, p_description);

  -- Notify recipient
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_recipient_id,
    'sc_gift',
    'Stiglo ti je piće',
    COALESCE(p_description, 'Neko ti je poslao Scene Credits'),
    jsonb_build_object('amount_cents', p_amount_cents, 'sender_id', v_sender_id, 'venue_id', p_venue_id)
  );

  RETURN jsonb_build_object('new_balance_cents', v_new_sender_balance);
END;
$$;

-- ============================================
-- RPC: spend_scene_credits_at_venue
-- ============================================
CREATE OR REPLACE FUNCTION public.spend_scene_credits_at_venue(
  p_venue_id uuid,
  p_amount_cents integer,
  p_description text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance integer;
  v_new_balance integer;
  v_active boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT active INTO v_active FROM public.partner_venues_sc WHERE id = p_venue_id;
  IF NOT COALESCE(v_active, false) THEN
    RAISE EXCEPTION 'Venue is not an active partner';
  END IF;

  SELECT balance_cents INTO v_balance
  FROM public.scene_credits_accounts WHERE user_id = v_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_amount_cents THEN
    RAISE EXCEPTION 'Insufficient Scene Credits';
  END IF;

  UPDATE public.scene_credits_accounts
  SET balance_cents = balance_cents - p_amount_cents,
      lifetime_spent_cents = lifetime_spent_cents + p_amount_cents,
      updated_at = now()
  WHERE user_id = v_user_id
  RETURNING balance_cents INTO v_new_balance;

  INSERT INTO public.scene_credits_transactions (user_id, type, amount_cents, venue_id, description)
  VALUES (v_user_id, 'spend', -p_amount_cents, p_venue_id, p_description);

  RETURN v_new_balance;
END;
$$;

-- ============================================
-- SEED: 3 partner venues
-- ============================================
INSERT INTO public.partner_venues_sc (venue_name, brand_color) VALUES
  ('Drugstore', '#EF9F27'),
  ('Karmakoma', '#5DCAA5'),
  ('Para', '#D85A30')
ON CONFLICT (venue_name) DO NOTHING;
