-- Storage bucket for challenge entry media
INSERT INTO storage.buckets (id, name, public)
VALUES ('challenge-entries', 'challenge-entries', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Challenge entry media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'challenge-entries');

-- Authenticated users can upload to their own folder (path: {user_id}/...)
CREATE POLICY "Users upload own challenge media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'challenge-entries'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update own challenge media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'challenge-entries'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own challenge media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'challenge-entries'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own entries while challenge is still live
CREATE POLICY "Users delete own entry on live challenges"
ON public.challenge_entries FOR DELETE
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_entries.challenge_id AND c.status = 'live'
  )
);