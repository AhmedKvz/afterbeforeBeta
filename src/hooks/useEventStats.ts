import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EventStats {
  avg_rating: number;
  review_count: number;
  latest_review: string | null;
}

export const useEventStats = (eventId: string) => {
  return useQuery({
    queryKey: ['event-stats', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_event_stats', { event_uuid: eventId });

      if (error) throw error;
      
      const stats = data?.[0] || { avg_rating: 0, review_count: 0, latest_review: null };
      return stats as EventStats;
    },
    staleTime: 60000,
  });
};

export const useBestPartyThisWeek = () => {
  return useQuery({
    queryKey: ['best-party-this-week'],
    queryFn: async () => {
      // Get all events with their reviews
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0]);

      if (error) throw error;

      // Get reviews for all events
      const { data: reviews } = await supabase
        .from('event_reviews')
        .select('event_id, rating, created_at');

      if (!events || events.length === 0) return null;

      // Calculate trending scores
      const eventsWithScores = events.map(event => {
        const eventReviews = reviews?.filter(r => r.event_id === event.id) || [];
        const avgRating = eventReviews.length > 0
          ? eventReviews.reduce((sum, r) => sum + r.rating, 0) / eventReviews.length
          : 0;
        const reviewCount = eventReviews.length;
        const latestReview = eventReviews.length > 0
          ? new Date(Math.max(...eventReviews.map(r => new Date(r.created_at).getTime())))
          : null;

        let score = 0;
        if (latestReview && reviewCount > 0) {
          const hoursSinceReview = (Date.now() - latestReview.getTime()) / (1000 * 60 * 60);
          const recencyFactor = Math.max(0.5, 1 - (hoursSinceReview / 168));
          score = avgRating * reviewCount * recencyFactor;
        }

        return {
          ...event,
          avgRating,
          reviewCount,
          latestReview,
          trendingScore: score,
        };
      });

      // Sort by trending score
      eventsWithScores.sort((a, b) => b.trendingScore - a.trendingScore);

      return eventsWithScores[0] || null;
    },
    staleTime: 60000,
  });
};
