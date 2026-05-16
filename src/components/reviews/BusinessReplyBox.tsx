import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  reviewId: string;
  venueName: string;
}

export const BusinessReplyBox = ({ reviewId, venueName }: Props) => {
  const { user, profile } = useAuth();
  const [text, setText] = useState('');
  const qc = useQueryClient();

  const canReply =
    profile?.account_type === 'club_venue' && profile?.venue_name === venueName;

  const submit = useMutation({
    mutationFn: async () => {
      if (!user || !text.trim()) return;
      const { error } = await supabase.from('business_replies').insert({
        review_id: reviewId,
        venue_name: venueName,
        replier_id: user.id,
        reply_text: text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reply posted');
      setText('');
      qc.invalidateQueries({ queryKey: ['venue-reviews', venueName] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!canReply) return null;

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
        Reply as venue
      </p>
      <Textarea
        rows={2}
        placeholder="Thanks for the feedback…"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 500))}
      />
      <Button
        size="sm"
        onClick={() => submit.mutate()}
        disabled={!text.trim() || submit.isPending}
      >
        Post reply
      </Button>
    </div>
  );
};
