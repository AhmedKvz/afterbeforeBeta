import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { incrementQuestProgress } from '@/services/questProgress';
import { toast } from 'sonner';

export interface PartyOfMonth {
  event: any;
  score: number;
  vote_count: number;
  avg_rating: number;
  review_count: number;
  activity: number;
  user_voted: boolean;
}

/**
 * Party of the Month — the winning event for the current calendar month,
 * chosen by a blended score (quality + activity + recency + votes).
 * Backed by the get_party_of_month() RPC.
 */
export const usePartyOfMonth = () => {
  return useQuery<PartyOfMonth | null>({
    queryKey: ['party-of-month'],
    queryFn: async () => {
      // RPC not in generated types yet — cast to any.
      const { data, error } = await (supabase as any).rpc('get_party_of_month');
      if (error) throw error;
      return (data as PartyOfMonth) || null;
    },
    staleTime: 60_000,
  });
};

/**
 * Cast (or move) the current user's vote for the Party of the Month.
 * Also nudges the "vote_best_party" quest forward.
 */
export const usePartyOfMonthVote = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error('Not logged in');

      const { data, error } = await (supabase as any).rpc('cast_party_of_month_vote', {
        p_event_id: eventId,
      });
      if (error) throw error;

      // Progress the monthly voting quest (no-op if not assigned this week).
      await incrementQuestProgress(user.id, 'vote_best_party');

      return data as { event_id: string; vote_count: number; voted: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['party-of-month'] });
      queryClient.invalidateQueries({ queryKey: ['user-quests'] });
      toast('Vote counted! 🗳️', { description: 'Thanks for backing your Party of the Month.' });
    },
    onError: (e: any) => {
      toast('Could not save vote', { description: e?.message ?? 'Try again in a moment.' });
    },
  });
};
