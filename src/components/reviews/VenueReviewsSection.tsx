import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Star, MessageSquarePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ReviewCard, ReviewWithExtras } from './ReviewCard';
import { WriteReviewModal } from './WriteReviewModal';
import { AIVenueSummaryCard } from './AIVenueSummaryCard';
import { VENUE_TYPE_LABEL } from './reviewTags';

type SortKey = 'newest' | 'highest' | 'lowest' | 'photos' | 'verified';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'highest', label: 'Highest' },
  { key: 'lowest', label: 'Lowest' },
  { key: 'photos', label: 'With photos' },
  { key: 'verified', label: 'Verified' },
];

interface Props {
  venueName: string;
  venueType?: string | null;
  eventId?: string | null;
  className?: string;
}

export const VenueReviewsSection = ({
  venueName,
  venueType = 'club',
  eventId,
  className,
}: Props) => {
  const { user } = useAuth();
  const [sort, setSort] = useState<SortKey>('newest');
  const [open, setOpen] = useState(false);

  const statsQ = useQuery({
    queryKey: ['venue-stats', venueName],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_venue_review_stats', {
        p_venue_name: venueName,
      });
      if (error) throw error;
      return data as any;
    },
  });

  const reviewsQ = useQuery({
    queryKey: ['venue-reviews', venueName],
    queryFn: async () => {
      const { data: reviews, error } = await supabase
        .from('event_reviews')
        .select('*')
        .eq('venue_name', venueName)
        .neq('moderation_status', 'flagged')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      const ids = (reviews || []).map((r) => r.id);
      const userIds = Array.from(new Set((reviews || []).map((r) => r.user_id)));

      const [photosRes, profilesRes, repliesRes, myVotesRes] = await Promise.all([
        ids.length
          ? supabase.from('review_photos').select('id, review_id, photo_url').in('review_id', ids)
          : Promise.resolve({ data: [] } as any),
        userIds.length
          ? supabase
              .from('profiles')
              .select('user_id, display_name, avatar_url')
              .in('user_id', userIds)
          : Promise.resolve({ data: [] } as any),
        ids.length
          ? supabase
              .from('business_replies')
              .select('id, review_id, reply_text, created_at, venue_name')
              .in('review_id', ids)
          : Promise.resolve({ data: [] } as any),
        user && ids.length
          ? supabase
              .from('review_votes')
              .select('review_id')
              .eq('user_id', user.id)
              .in('review_id', ids)
          : Promise.resolve({ data: [] } as any),
      ]);

      const photosByReview: Record<string, any[]> = {};
      (photosRes.data || []).forEach((p: any) => {
        (photosByReview[p.review_id] = photosByReview[p.review_id] || []).push(p);
      });
      const profileMap = new Map<string, any>(
        (profilesRes.data || []).map((p: any) => [p.user_id, p])
      );
      const replyByReview = new Map<string, any>(
        (repliesRes.data || []).map((r: any) => [r.review_id, r])
      );
      const votedSet = new Set<string>((myVotesRes.data || []).map((v: any) => v.review_id));

      return (reviews || []).map((r) => ({
        ...r,
        photos: photosByReview[r.id] || [],
        profile: profileMap.get(r.user_id) || null,
        reply: replyByReview.get(r.id) || null,
        user_voted: votedSet.has(r.id),
      })) as ReviewWithExtras[];
    },
  });

  const filteredSorted = useMemo(() => {
    const list = [...(reviewsQ.data || [])];
    switch (sort) {
      case 'highest':
        return list.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return list.sort((a, b) => a.rating - b.rating);
      case 'photos':
        return list.filter((r) => (r.photos?.length ?? 0) > 0);
      case 'verified':
        return list.filter((r) => r.verified_visit);
      default:
        return list;
    }
  }, [reviewsQ.data, sort]);

  const stats = statsQ.data || { avg_rating: 0, review_count: 0, verified_count: 0 };

  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Reviews</h2>
          <p className="text-xs text-muted-foreground">
            {VENUE_TYPE_LABEL[venueType || 'club'] || 'Venue'} · {venueName}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          disabled={!user}
          className="bg-gradient-to-r from-purple-500 to-pink-500"
        >
          <MessageSquarePlus className="mr-1 h-4 w-4" />
          Write review
        </Button>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-3 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
      >
        <div className="text-center">
          <div className="text-3xl font-black text-yellow-300">
            {Number(stats.avg_rating || 0).toFixed(1)}
          </div>
          <div className="mt-0.5 flex justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-3 w-3 ${
                  s <= Math.round(Number(stats.avg_rating || 0))
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground/40'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="border-l border-border pl-4 text-sm">
          <div className="text-foreground">
            <span className="font-bold">{stats.review_count}</span>{' '}
            <span className="text-muted-foreground">reviews</span>
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-bold text-yellow-300">{stats.verified_count}</span> verified visits
          </div>
        </div>
      </motion.div>

      {/* AI summary */}
      {stats.review_count >= 3 && (
        <div className="mb-3">
          <AIVenueSummaryCard venueName={venueName} />
        </div>
      )}

      {/* Filters */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              sort === s.key
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* List */}
      {reviewsQ.isLoading ? (
        <div className="py-6 text-center text-sm text-muted-foreground">Loading reviews…</div>
      ) : filteredSorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No reviews yet. Be the first to share the vibe.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSorted.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}

      <WriteReviewModal
        open={open}
        onOpenChange={setOpen}
        venueName={venueName}
        venueType={venueType || 'club'}
        eventId={eventId || null}
        onSubmitted={() => {
          reviewsQ.refetch();
          statsQ.refetch();
        }}
      />
    </section>
  );
};
