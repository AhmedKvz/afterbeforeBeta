import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ThumbsUp, Flag, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { VerifiedVisitBadge } from './VerifiedVisitBadge';
import { ReportReviewDialog } from './ReportReviewDialog';
import { BusinessReplyBox } from './BusinessReplyBox';

export interface ReviewWithExtras {
  id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  vibe_tags: string[] | null;
  visit_date: string | null;
  created_at: string;
  verified_visit: boolean;
  helpful_count: number;
  venue_name: string | null;
  moderation_status?: string | null;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
  photos?: { id: string; photo_url: string }[];
  reply?: {
    id: string;
    reply_text: string;
    created_at: string;
    venue_name: string;
  } | null;
  user_voted?: boolean;
}

const ModerationPill = ({ status }: { status: string }) => {
  const meta: Record<string, { label: string; cls: string }> = {
    pending: { label: '⏳ Pending review', cls: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
    flagged: { label: '⚠️ Flagged', cls: 'bg-destructive/15 text-destructive border-destructive/30' },
    published: { label: '✓ Published', cls: 'bg-success/15 text-success border-success/30' },
  };
  const m = meta[status] || meta.pending;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${m.cls}`}>
      {m.label}
    </span>
  );
};

export const ReviewCard = ({
  review,
  onChange,
}: {
  review: ReviewWithExtras;
  onChange?: () => void;
}) => {
  const { user } = useAuth();
  const [voted, setVoted] = useState(!!review.user_voted);
  const [count, setCount] = useState(review.helpful_count);
  const [reportOpen, setReportOpen] = useState(false);

  const toggleHelpful = async () => {
    if (!user) {
      toast.error('Sign in to vote');
      return;
    }
    const { data, error } = await supabase.rpc('toggle_review_helpful', {
      p_review_id: review.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    const d = data as any;
    setVoted(!!d?.voted);
    setCount(d?.helpful_count ?? count);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
          {review.profile?.avatar_url ? (
            <img src={review.profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              {(review.profile?.display_name || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">
              {review.profile?.display_name || 'Anonymous'}
            </span>
            {review.verified_visit && <VerifiedVisitBadge />}
            {user?.id === review.user_id && review.moderation_status && review.moderation_status !== 'approved' && (
              <ModerationPill status={review.moderation_status} />
            )}
            <span className="text-xs text-muted-foreground">
              {format(new Date(review.created_at), 'MMM d, yyyy')}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-4 w-4 ${
                  s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'
                }`}
              />
            ))}
            {review.visit_date && (
              <span className="ml-2 text-[11px] text-muted-foreground">
                Visited {format(new Date(review.visit_date), 'MMM d')}
              </span>
            )}
          </div>
        </div>
      </div>

      {review.review_text && (
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{review.review_text}</p>
      )}

      {review.vibe_tags && review.vibe_tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {review.vibe_tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {review.photos && review.photos.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {review.photos.map((p) => (
            <a
              key={p.id}
              href={p.photo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square overflow-hidden rounded-lg border border-white/10"
            >
              <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs">
        <button
          onClick={toggleHelpful}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 transition ${
            voted
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Helpful · {count}
        </button>
        <button
          onClick={() => setReportOpen(true)}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-muted-foreground hover:bg-white/5"
        >
          <Flag className="h-3.5 w-3.5" />
          Report
        </button>
      </div>

      {review.reply && (
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <MessageSquare className="h-3 w-3" />
            Reply from {review.reply.venue_name}
          </div>
          <p className="text-sm text-foreground/90">{review.reply.reply_text}</p>
        </div>
      )}

      {!review.reply && review.venue_name && (
        <BusinessReplyBox reviewId={review.id} venueName={review.venue_name} />
      )}

      <ReportReviewDialog reviewId={review.id} open={reportOpen} onOpenChange={setReportOpen} />
    </motion.div>
  );
};
