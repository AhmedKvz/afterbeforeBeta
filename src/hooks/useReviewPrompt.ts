import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnreviewedCheckin {
  id: string;
  event_id: string;
  checked_in_at: string;
  event: {
    id: string;
    title: string;
    venue_name: string;
    image_url: string;
  };
}

export const useReviewPrompt = () => {
  const { user } = useAuth();
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const [hasPromptedThisSession, setHasPromptedThisSession] = useState(false);

  const { data: unreviewedCheckins } = useQuery({
    queryKey: ['unreviewed-checkins', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // Get user's checkins from last 24 hours
      const { data: checkins, error: checkinsError } = await supabase
        .from('event_checkins')
        .select(`
          id,
          event_id,
          checked_in_at,
          events!inner(id, title, venue_name, image_url)
        `)
        .eq('user_id', user.id)
        .lt('checked_in_at', twentyFourHoursAgo.toISOString());

      if (checkinsError) throw checkinsError;

      // Get user's existing reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from('event_reviews')
        .select('event_id')
        .eq('user_id', user.id);

      if (reviewsError) throw reviewsError;

      const reviewedEventIds = new Set(reviews?.map(r => r.event_id) || []);

      // Filter to only unreviewed checkins
      const unreviewed = (checkins || [])
        .filter(c => !reviewedEventIds.has(c.event_id))
        .map(c => ({
          id: c.id,
          event_id: c.event_id,
          checked_in_at: c.checked_in_at,
          event: c.events as any,
        }));

      return unreviewed as UnreviewedCheckin[];
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  useEffect(() => {
    if (unreviewedCheckins && unreviewedCheckins.length > 0 && !hasPromptedThisSession) {
      // Small delay to not interrupt initial page load
      const timer = setTimeout(() => {
        setShouldShowModal(true);
        setHasPromptedThisSession(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [unreviewedCheckins, hasPromptedThisSession]);

  const dismissPrompt = useCallback(() => {
    setShouldShowModal(false);
  }, []);

  const eventToReview = unreviewedCheckins?.[0]?.event || null;

  return {
    shouldShowModal,
    eventToReview,
    dismissPrompt,
    unreviewedCount: unreviewedCheckins?.length || 0,
  };
};
