-- Founding Raver invite system: link-based onboarding with numbered prestige.
-- Invite link: ?founder=OSNIVAC  (share this with your first 100 Belgrade ravers)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founding_raver_number INT UNIQUE;

-- Claim founding raver status via invite code.
-- Called once during onboarding; idempotent (safe to call twice).
CREATE OR REPLACE FUNCTION public.claim_founding_raver(p_code TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user   UUID := auth.uid();
  v_number INT;
  v_code   TEXT := 'OSNIVAC';   -- change this to rotate codes
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF UPPER(TRIM(p_code)) != v_code THEN RAISE EXCEPTION 'Invalid founder code'; END IF;

  -- Already claimed → return existing number (idempotent)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user AND is_founding_raver = true) THEN
    SELECT founding_raver_number INTO v_number FROM public.profiles WHERE user_id = v_user;
    RETURN json_build_object('number', v_number, 'already', true, 'xp', 0);
  END IF;

  -- Assign next sequential number (gap-free within transaction)
  SELECT COALESCE(MAX(founding_raver_number), 0) + 1 INTO v_number
  FROM public.profiles WHERE is_founding_raver = true;

  UPDATE public.profiles
  SET is_founding_raver      = true,
      founding_raver_number  = v_number,
      xp                     = COALESCE(xp, 0) + 500,
      spendable_xp           = COALESCE(spendable_xp, 0) + 500
  WHERE user_id = v_user;

  INSERT INTO public.xp_transactions (user_id, amount, reason)
  VALUES (v_user, 500, 'Founding Raver');

  RETURN json_build_object('number', v_number, 'already', false, 'xp', 500);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_founding_raver(TEXT) TO authenticated;
