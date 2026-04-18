-- Challenges
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_url text,
  challenge_type text NOT NULL DEFAULT 'community', -- 'sponsored' | 'community'
  status text NOT NULL DEFAULT 'live', -- 'live' | 'voting' | 'resolved'
  prize_pool_cents integer NOT NULL DEFAULT 0,
  prize_description text,
  sponsor_name text,
  sponsor_logo_url text,
  sponsor_color text DEFAULT '#7F77DD',
  venue_id uuid REFERENCES public.partner_venues_sc(id),
  created_by uuid,
  submission_deadline timestamptz NOT NULL,
  voting_deadline timestamptz NOT NULL,
  resolved_at timestamptz,
  winner_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_challenges_status ON public.challenges(status, voting_deadline DESC);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view challenges"
  ON public.challenges FOR SELECT USING (true);

-- Entries
CREATE TABLE public.challenge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  media_url text,
  caption text,
  vote_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX idx_entries_challenge ON public.challenge_entries(challenge_id, vote_count DESC);

ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view entries"
  ON public.challenge_entries FOR SELECT USING (true);

CREATE POLICY "Users can create own entry on live challenges"
  ON public.challenge_entries FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.status = 'live'
    )
  );

-- Votes
CREATE TABLE public.challenge_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.challenge_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX idx_votes_user ON public.challenge_votes(user_id, challenge_id);

ALTER TABLE public.challenge_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view votes"
  ON public.challenge_votes FOR SELECT USING (true);

-- Vote RPC
CREATE OR REPLACE FUNCTION public.vote_on_challenge_entry(p_entry_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_entry RECORD;
  v_challenge RECORD;
  v_new_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_entry FROM public.challenge_entries WHERE id = p_entry_id;
  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;

  SELECT * INTO v_challenge FROM public.challenges WHERE id = v_entry.challenge_id;
  IF v_challenge.status != 'voting' THEN
    RAISE EXCEPTION 'Challenge is not in voting phase';
  END IF;
  IF now() > v_challenge.voting_deadline THEN
    RAISE EXCEPTION 'Voting has ended';
  END IF;
  IF v_entry.user_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot vote for your own entry';
  END IF;

  -- Insert vote (will fail on unique violation if already voted)
  BEGIN
    INSERT INTO public.challenge_votes (challenge_id, entry_id, user_id)
    VALUES (v_entry.challenge_id, p_entry_id, v_user_id);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already voted on this challenge';
  END;

  UPDATE public.challenge_entries
  SET vote_count = vote_count + 1
  WHERE id = p_entry_id
  RETURNING vote_count INTO v_new_count;

  RETURN jsonb_build_object('new_vote_count', v_new_count);
END;
$$;