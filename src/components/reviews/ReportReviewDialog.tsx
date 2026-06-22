import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const REASONS = [
  { id: 'spam', label: 'Spam' },
  { id: 'offensive', label: 'Offensive language' },
  { id: 'fake', label: 'Fake review' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'other', label: 'Other' },
];

export const ReportReviewDialog = ({
  reviewId,
  open,
  onOpenChange,
}: {
  reviewId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) {
      toast.error('Sign in to report');
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).rpc('flag_review', { p_review_id: reviewId, p_reason: reason });
    setSubmitting(false);
    if (error) {
      toast.error(error.message?.includes('prijaviti') ? error.message : 'Greška — pokušaj ponovo.');
    } else {
      toast.success('Prijavljeno. Hvala što čuvaš scenu.');
      onOpenChange(false);
      setDetails('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border">
        <DialogHeader>
          <DialogTitle>Report review</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setReason(r.id)}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  reason === r.id
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Add details (optional)"
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, 400))}
            rows={3}
          />
          <Button className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit report'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
